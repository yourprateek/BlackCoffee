import httpx
import os
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from typing import Dict, List, TypedDict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from tavily import AsyncTavilyClient
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv
load_dotenv()

class SkillState(TypedDict):
    paid_filter: bool
    skill: str
    courses_available: List[Dict[str, Any]]
    conclusion: str

courses_domains = [
    "coursera.org",
    "edx.org",
    "udemy.com",
    "futurelearn.com",
    "linkedin.com",
    "pluralsight.com",
    "datacamp.com",
    "codecademy.com",
    "udacity.com",
    "skillshare.com",
    "masterclass.com",
    "domestika.org",
    "corporatefinanceinstitute.com"
]

def router(state: SkillState) -> str:
    paid_filter = state['paid_filter']
    if paid_filter:
        return "web_search"
    return "youtube_search"

async def paid_course_search(state: SkillState) -> Dict:

    skill = state['skill']
    tavily_query = f"site:*.com OR site:*.org '{skill}' complete certification course training curriculum"
    model = ChatGoogleGenerativeAI(
        model= 'gemini-2.5-flash'
    )
    client = AsyncTavilyClient()

    tavily_response = await client.search(
                query= tavily_query,
                search_depth= "advanced",
                max_results= 8,
                include_domains= courses_domains
            )

    search_results: List[Dict] = tavily_response.get('results')

    final_results = []
    for result in search_results:
        final_results.append({'title': result['title'], 
                      'url': result['url'], 
                      'content': result['content']
                      })

    prompt = PromptTemplate.from_template(
        template= """
    You are an expert AI Career Counselor and Curriculum Curator. 
    Your task is to analyze raw search data for a specific skill/skill and transform it into a structured, 
    highly valuable learning roadmap summary for the user.

    You will receive input as a list of dictionaries containing titles, URLs, and text snippets of available courses.

    ### Core Objectives:
    1. Identify the skill being learned.
    2. Provide a 2-3 sentence strategic executive summary explaining what a learner can realistically expect to achieve by taking these courses (e.g., industry readiness, foundational skills, or specialized career tracks).
    3. Identify the common core topics or patterns present across the curriculum snippets.
    4. Extract 2-3 actionable "Key Insights" or recommendations (e.g., advising if they should start with a specific platform based on their background, or noting if certain certifications require prerequisites).

    ### Formatting & Constraints:
    - Do not repeat the URLs or list the courses verbatim. The UI already handles the links.
    - Focus strictly on synthesized insights and comparative value.
    - Speak directly to the learner using a encouraging, professional tone.
    - Do not assume or hallucinate features, prices, or details not present in the snippets.  

    ### Output 
    Give a summary of all the data and recommendations or key insights for the data.
    The search data is : {final_results}
    """
    )

    formatted_prompt = prompt.format(final_results=final_results)
    response = await model.ainvoke(formatted_prompt)

    return {
        'courses_available': final_results,
        'conclusion': response.content
    }



async def free_course_search(state: SkillState) -> Dict:

    url = "https://google.serper.dev/search"
    
    headers = {
        'X-API-KEY': os.environ.get("SERPER_API_KEY"),
        'Content-Type': 'application/json'
    }
    skill = state['skill']
    payload = {
        "q": f"{skill} full course tutorial",
        "hl": "en" 
    }
    model = ChatGoogleGenerativeAI(
        model='gemini-2.5-flash'
    )
    
    async with httpx.AsyncClient() as client:
        # This will now hit Serper's actual API pipeline engine cleanly
        response = await client.request("POST", url, headers=headers, json=payload)
        data = response.json()
    
    free_courses = []
    for video in data.get("organic", [])[:10]:
        free_courses.append({
            "title": video.get("title"),
            "url": video.get("link"),
            "channel": video.get("channel"),
            "description": video.get("snippet")
        })
        
    prompt = PromptTemplate.from_template(
        template="""
    You are an expert AI Career Counselor and open-source learning curator. 
    Your task is to analyze raw search data for a specific skill from YouTube and transform it into a structured, 
    high-value learning roadmap summary for the user.

    The search data is: {free_courses_str}
    Do not include the introductory part.
    """
    )

    free_courses_str = str(free_courses) if free_courses else "No video search results returned for this skill."

    formatted_prompt = prompt.format(free_courses_str=free_courses_str)
    response = await model.ainvoke(formatted_prompt)
    
    return {
        'courses_available': free_courses_str,
        'conclusion': response.content
    }



graph = StateGraph(SkillState)

graph.add_node("web_search", paid_course_search)
graph.add_node("youtube_search", free_course_search)

graph.add_conditional_edges(START, router)
graph.add_edge("web_search", END)
graph.add_edge("youtube_search", END)

memory = MemorySaver()
skill_builder = graph.compile(checkpointer= memory)