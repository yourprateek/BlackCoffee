import asyncio
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.graph import add_messages
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, TypedDict, Literal, Annotated, Any
from langchain_groq import ChatGroq
from tavily import AsyncTavilyClient
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import AnyMessage, AIMessage
from langchain_core.output_parsers import PydanticOutputParser
from schemas.schema import VacanciesSchema
from dotenv import load_dotenv
load_dotenv()

class ResearchVacancyState(TypedDict):
    skills: List[str]
    location: str
    vacancy_type: Literal['Internship', 'Job']
    messages: Annotated[List[AnyMessage], add_messages]
    current_roles: List[Dict[str,Any]]

career_websites = [
        "linkedin.com",
        "indeed.com",
        "simplyhired.com",
        "unstop.com",
        "internshala.com",
        "simplify.jobs",
        "handshake.com",
        "careerbuilder.com",
        "glassdoor.com"
    ]

client = AsyncTavilyClient()

def router(state: ResearchVacancyState) -> str:
    type = state['vacancy_type']

    if type == 'Internship':
        return "Internship_search"
    return "Job_search"

# Node - 1: For Internships

async def internship_search_node(state: ResearchVacancyState) -> Dict[str, Any]:
    """LangGraph Node that gets the source data from different domains for the vacancies as internships according to the skills 
    a user possess"""

    if not state.get('skills'):
        return {"messages": [AIMessage(content="No skills provided to search for internships.")]}
    
    try:
        skills_query = " OR ".join([f'"{skill}"' for skill in state['skills']])
        location_filter = f'"{state['location']}" "India"' if state['location'] else '"India"'
    
        tavily_query = f'({skills_query}) {location_filter} internship -job -full-time -senior find the oppurtunities near to the location'
        
        tavily_response = await client.search(
            query= tavily_query,
            search_depth= "advanced",
            max_results= 6,
            include_domains= career_websites
        )

        search_result = tavily_response.get('results', [])

        if not search_result:
            return {"messages": [AIMessage(content="No active internships found matching your criteria.")]}

        llm = ChatGroq(
            model= 'openai/gpt-oss-120b',
            temperature= 0.1
        )
        parser = PydanticOutputParser(pydantic_object= VacanciesSchema)

        prompt = PromptTemplate.from_template(
            template= """You will be provided with the web searched internship openings.
            The user attributes are :- 
            skills :- {skills_query}
            location :- {location_filter}
            For matching score, analyze the similarity between the openings and the user attributes(score out of 100).
            Carefully, extract the following attributes from each opening.
            {format_instructions}

            The web searched raw data is : {raw_input}
            """
        )

        chain = prompt | llm | parser
        response = await chain.ainvoke({
            "raw_input": search_result,
            "format_instructions": parser.get_format_instructions(),
            "skills_query": skills_query,
            "location_filter": location_filter
        })

        await asyncio.sleep(1.0)
        return {
            'current_roles': response.model_dump() if hasattr(response, "model_dump") else response,
            'messages': [AIMessage(content=f"Successfully extracted active internships matching skills: {', '.join(state['skills'])}")]
        }

    except Exception as error:
        return {"messages": [AIMessage(content=f"An error occurred while tracking internships: {str(error)}")]}

# Node 2 - For Jobs

async def job_search_node(state: ResearchVacancyState) -> Dict[str, Any]:
    """
    LangGraph Node that reads user skills and location from the state,
    queries Tavily asynchronously for full-time jobs.
    """
    if not state.get('skills'):
        return {
            "messages": [AIMessage(content="I couldn't find any skills in your profile to search with.")]
        }

    try:
        skills_query = " OR ".join([f'"{skill}"' for skill in state['skills']])
        tavily_query = f'({skills_query}) (India) job vacancy hiring -internship -coop -stipend'.strip()
        
        tavily_response = await client.search(
            query=tavily_query,
            search_depth="advanced",
            max_results=6,
            include_domains=career_websites
        )
        search_result = tavily_response.get('results', [])

        if not search_result:
            return {
                "messages": [AIMessage(content="No active full-time jobs found matching your skills and location right now.")]
            }

        llm = ChatGroq(
                    model= 'openai/gpt-oss-120b',
                    temperature= 0.1
        )
        parser = PydanticOutputParser(pydantic_object=VacanciesSchema)

        prompt = PromptTemplate.from_template(
            template="""You are an AI career expert parsing raw web data.
            Extract the active full-time job vacancies into the requested structured format.
            The user attributes are :- 
            skills :- {skills_query}
            Ensure you filter out any stray internship or short-term training listings.
            For the matching_score, analyze the similarity between the jobs and the user attributes(score out of 100).
            {format_instructions}

            Raw search data:
            {raw_input}
            """
        )
        
        chain = prompt | llm | parser
        response = await chain.ainvoke({
            "raw_input": search_result,
            "format_instructions": parser.get_format_instructions(),
            "skills_query": skills_query
        })

        return {
            "current_roles": response.model_dump() if hasattr(response, "model_dump") else response, 
            "messages": [AIMessage(content=f"Found and extracted active full-time jobs for: {', '.join(state['skills'])}")]
        }

    except Exception as error:
        return {
            "messages": [AIMessage(content=f"An error occurred while executing the job search node: {str(error)}")]
        }

graph = StateGraph(ResearchVacancyState)

graph.add_node("Internship_search", internship_search_node)
graph.add_node("Job_search", job_search_node)

graph.add_conditional_edges(START, router)
graph.add_edge("Internship_search", END)
graph.add_edge("Job_search", END)

memory = MemorySaver()
compiled_graph = graph.compile(checkpointer=memory)