from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.graph import add_messages
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, TypedDict, Literal, Annotated, Any
from langchain_mistralai import ChatMistralAI
from tavily import AsyncTavilyClient
from langchain_core.prompts import PromptTemplate
from langchain_core.messages import AnyMessage, AIMessage
from langchain_core.output_parsers import PydanticOutputParser
from backend.schemas.schema import VacanciesSchema
from dotenv import load_dotenv
load_dotenv()

class ResearchVacancyState(TypedDict):
    skills: List[str]
    location: str
    vacancy_type: Literal['Internship', 'Job']
    messages: Annotated[List[AnyMessage], add_messages]
    current_roles: List[Dict[str,Any]]
    load_more: bool

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
        location_filter = f'"{state["location"]}"' if state.get('location') else ""
    
        tavily_query = f'({skills_query}) {location_filter} internship -job -full-time -senior'.strip()
        
        tavily_response = await client.search(
            query= tavily_query,
            search_depth= "advanced",
            max_results= 5,
            include_domains= career_websites
        )

        search_result = tavily_response.get('results', [])

        if not search_result:
            return {"messages": [AIMessage(content="No active internships found matching your criteria.")]}

        llm = ChatMistralAI(
            model_name= "mistral-small-latest",
            temperature= 0.2
        )
        parser = PydanticOutputParser(pydantic_object= VacanciesSchema)

        prompt = PromptTemplate.from_template(
            template= """You will be provided with the web searched internship openings.
            Carefully, extract the following attributes from each opening.
            {format_instructions}

            The web searched raw data is : {raw_input}
            """
        )

        chain = prompt | llm | parser
        response = await chain.ainvoke({
            "raw_input": search_result,
            "format_instructions": parser.get_format_instructions()
        })

        return {
            'current_roles': response,
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
        location_filter = f'"{state["location"]}"' if state.get('location') else ""
        tavily_query = f'({skills_query}) {location_filter} job vacancy hiring -internship -coop -stipend'.strip()
        
        tavily_response = await client.search(
            query=tavily_query,
            search_depth="advanced",
            max_results=5,
            include_domains=career_websites
        )
        search_result = tavily_response.get('results', [])

        if not search_result:
            return {
                "messages": [AIMessage(content="No active full-time jobs found matching your skills and location right now.")]
            }

        llm = ChatMistralAI(
            model_name="mistral-small-latest",
            temperature=0.2
        )
        parser = PydanticOutputParser(pydantic_object=VacanciesSchema)

        prompt = PromptTemplate.from_template(
            template="""You are an AI career expert parsing raw web data.
            Extract the active full-time job vacancies into the requested structured format.
            Ensure you filter out any stray internship or short-term training listings.
            
            {format_instructions}

            Raw search data:
            {raw_input}
            """
        )
        
        chain = prompt | llm | parser
        response = await chain.ainvoke({
            "raw_input": search_result,
            "format_instructions": parser.get_format_instructions()
        })

        return {
            "current_roles": response, 
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