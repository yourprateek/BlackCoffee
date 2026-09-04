from database.configurations import user_chat_collections
from schemas.user_schema import User
from database.user_db import get_user_data
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from typing import List, TypedDict, Optional, Annotated

class ChatState(TypedDict):
    email: str
    message: str
    thread_title: Optional[str]  
    messages_history: Annotated[List[dict], add_messages]
    final_reply: str

async def chat_history_node(state: ChatState):
    email = state["email"].lower().strip()
    user_msg = state["message"]
    thread_title = state.get("thread_title")

    user_doc = await user_chat_collections.find_one({"email": email})

    if not user_doc:
        user_doc = {"email": email, "threads": []}
        await user_chat_collections.insert_one(user_doc)

    messages_to_process = []

    if not thread_title:
        words = user_msg.strip().split()
        generated_title = " ".join(words[:5]) + "..." if len(words) > 5 else " ".join(words)
        thread_title = generated_title if generated_title else "New Career Talk"
        
        user_data = await get_user_data(email)

        if isinstance(user_data, User):
            user_name = user_data.full_name
            user_skills = ', '.join(user_data.skills.user_skills)
            user_exp = ', '.join(user_data.experience.internships_done or [])
            user_courses_done = ', '.join(user_data.experience.courses_completed or [])
        else:
            user_name = "User"
            user_skills = "Not specified"
            user_exp = "None"
            user_courses_done = "None"

        system_instruction = (
            f"You are a professional AI Career Counselor.\n"
            f"The user name is {user_name}. The user has these skills: [{user_skills}].\n"
            f"Internships done: [{user_exp}] | Courses completed: [{user_courses_done}].\n"
            f"Guide the user according to their queries with targeted career roadmaps, skill demands, and guidance.\n"
            f"Politely decline non-career topics. If the user finalizes a choice, suggest adding the skill to their roadmap."
        )

        messages_to_process = [
            {"role": "system", "content": system_instruction},
            {"role": "human", "content": user_msg}
        ]
    else:
        target_thread = next((t for t in user_doc.get("threads", []) if t["thread_title"] == thread_title), None)
        
        if target_thread:
            messages_to_process = list(target_thread.get("messages", []))
            messages_to_process.append({"role": "human", "content": user_msg})
        else:
            messages_to_process = [{"role": "human", "content": user_msg}]

    return {
        "thread_title": thread_title,
        "messages_history": messages_to_process
    }

async def call_career_llm_node(state: ChatState):
    msgs_for_model = []
    
    for msg in state["messages_history"]:
        role = msg.get("role")
        content = msg.get("content", "")
        
        if role == "system":
            msgs_for_model.append(SystemMessage(content=content))
        elif role == "human":
            msgs_for_model.append(HumanMessage(content=content))
        elif role == "ai":
            msgs_for_model.append(AIMessage(content=content))

    model = ChatGoogleGenerativeAI(
        model= 'gemini-2.5-flash'
    )
    response = await model.ainvoke(msgs_for_model)
    
    return {"final_reply": response.content}
    
async def save_to_mongodb_node(state: ChatState):
    email = state["email"].lower().strip()
    thread_title = state["thread_title"]
    user_msg = state["message"]
    ai_reply = state["final_reply"]

    user_doc = await user_chat_collections.find_one({"email": email})
    threads = user_doc.get("threads", []) if user_doc else []
    thread_exists = any(t.get("thread_title") == thread_title for t in threads)

    if not thread_exists:
        system_msg = state["messages_history"][0]["content"] if state["messages_history"] else ""
        
        new_thread_data = {
            "thread_title": thread_title,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "human", "content": user_msg},
                {"role": "ai", "content": ai_reply}
            ]
        }
        await user_chat_collections.update_one(
            {"email": email},
            {"$push": {"threads": new_thread_data}},
            upsert=True
        )
    else:
        await user_chat_collections.update_one(
            {"email": email, "threads.thread_title": thread_title},
            {"$push": {
                "threads.$.messages": {
                    "$each": [
                        {"role": "human", "content": user_msg},
                        {"role": "ai", "content": ai_reply}
                    ]
                }
            }}
        )
    return {}

builder = StateGraph(ChatState)

builder.add_node("prepare_history", chat_history_node)
builder.add_node("run_llm", call_career_llm_node)
builder.add_node("save_data", save_to_mongodb_node)

builder.add_edge(START, "prepare_history")
builder.add_edge("prepare_history", "run_llm")
builder.add_edge("run_llm", "save_data")
builder.add_edge("save_data", END)

career_chat_graph = builder.compile()