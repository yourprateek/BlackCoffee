from ..database.configurations import user_chat_collections
from ..schemas.user_schema import User
from ..database.user_db import get_user_data
from ..schemas.schema import UserChatThreads
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_mistralai import ChatMistralAI
from pydantic import EmailStr
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from typing import List, TypedDict, Optional

class ChatState(TypedDict):
    email: str
    message: str
    thread_title: Optional[str]  
    messages_history: List[dict]
    final_reply: str

async def chat_history_node(state: ChatState):

    email = state["email"].lower().strip()       # fix: assign before use
    user_msg = state["message"]
    thread_title = state["thread_title"]

    user_doc = user_chat_collections.find_one({"email": email})

    if not user_doc:
        user_doc = {"email": email, "threads": []}
        user_chat_collections.insert_one(user_doc)

    messages_to_process = []

    if not thread_title:

        words = user_msg.strip().split()
        generated_title = " ".join(words[:5]) + "..." if len(words) > 5 else " ".join(words)
        thread_title = generated_title if generated_title else "New Career Talk"
        user: User = get_user_data(email)

        user_skills = ', '.join(user.skills)
        user_exp = ', '.join(user.experience.internships_done)
        user_courses_done: List[str] = ', '.join(user.experience.courses_completed)

        system_instruction = SystemMessage(
                content=f"""You are a professional AI Career Counselor. 
                The user name is {user.full_name}. The user has these skills: [{user_skills}].
                And the user has done internships as: [{user_exp}] and has done courses: [{user_courses_done}]
                With the help of all the past user data, you will guide the user according to his queries as a chatbot.
                If the user tries to distract you away from the career guidance environment, politely remind the user
                that you can only give response to the queries related to career guidance, skill roadmap, job demands etc.
                If you think that user is interested or has finalized his choice. Tell the user at the end to go and add his skill into the
                Skill Development tab. 
                """
            )

        messages_to_process = [
                {"role": "system", "content": system_instruction},
                {"role": "human", "content": user_msg}
            ]

    else:
        target_thread = next((t for t in user_doc.get("threads", []) if t["thread_title"] == thread_title), None)
        
        if target_thread:
            messages_to_process = list(target_thread["messages"])
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
        if msg["role"] == "system":
            msgs_for_model.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "human":
            msgs_for_model.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "ai":
            msgs_for_model.append(AIMessage(content=msg["content"]))

    model = ChatMistralAI(
        model_name= 'mistral-medium-latest',
        temperature= 0.45
    )
    response = await model.ainvoke(msgs_for_model)
    
    return {"final_reply": response.content}
    
def save_to_mongodb_node(state: ChatState):

    email = state["email"].lower().strip()
    thread_title = state["thread_title"]
    user_msg = state["message"]
    ai_reply = state["final_reply"]

    user_doc = user_chat_collections.find_one({"email": email})
    thread_exists = any(t["thread_title"] == thread_title for t in user_doc.get("threads", []))

    if not thread_exists:
        system_msg = state["messages_history"][0]["content"]
        
        new_thread_data = {
            "thread_title": thread_title,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "human", "content": user_msg},
                {"role": "ai", "content": ai_reply}
            ]
        }
        user_chat_collections.update_one(
            {"email": email},
            {"$push": {"threads": new_thread_data}}
        )
    else:

        user_chat_collections.update_one(
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
