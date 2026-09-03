from langchain_task import resume_analyzer, first_assessment_generator
from langchain_mistralai import ChatMistralAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import Runnable
from resume_rag import pdf_embedding_creator, resume_storage
from backend.database.user_db import get_user_db
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import EmailStr
from backend.schemas.schema import AssessmentSchema, AnalysisSchema, ResumeOutputSchema, CareerChatPayload
from database.user_db import get_user_data
from contextlib import asynccontextmanager
from langgraph.langgraph_task import compiled_graph
from langgraph.career_chat_db import career_chat_graph
from typing import Dict, List, Any, Literal, Annotated
from dotenv import load_dotenv
load_dotenv()

credentials = {}
@asynccontextmanager
async def site_credentials(app: FastAPI):

    user = get_user_db()

    mistral_medium_model = ChatMistralAI(
        model_name= "mistral-medium-latest",
        temperature= 0.6
    )

    gemini_model = ChatGoogleGenerativeAI(
        model= 'gemini-3-flash-preview'
    )

    mistral_small_model = ChatMistralAI(
        model_name= "mistral-small-latest"
    )

    groq_model = ChatGroq(
        model= "openai/gpt-oss-120b",
        temperature= 0.4
    )

    credentials['mistral_m_model'] = mistral_medium_model
    credentials['gemini_model'] = gemini_model
    credentials['mistral_s_model'] = mistral_small_model
    credentials['groq_model'] = groq_model

    yield credentials

app = FastAPI(title= "BlackCoffee", lifespan= site_credentials)

@app.get('/get_user_info')
async def get_user(user_email: EmailStr):
    user_data = get_user_data(email= user_email)

    return user_data.model_dump()

UserDependency = Annotated[dict, Depends(get_user)]

@app.post('/resume_upload')
async def skill_extractor(user: UserDependency, file: UploadFile = File(...)):

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Only PDF files are allowed."
        )

    model: ChatGoogleGenerativeAI = credentials['gemini_model']

    try:
        response = await resume_analyzer(user_file= file, func_model= model)
        user_file_to_store = await resume_storage(file)
        return response
    
    except Exception as error:
        return HTTPException(status_code= 500, detail= str(error))

@app.post('/initial_assessment')
async def first_assessment(user: UserDependency):

    model: ChatMistralAI = credentials['mistral_m_model']
    fields: List[str] = user['skills']
    try:
        response = first_assessment_generator(user_fields= fields, func_model= model)

        return response
    except Exception as error:
        return HTTPException(status_code= 404, detail= str(error))

@app.get('/oppurtunities')
async def job_intern_recommender(user: UserDependency, vacancy_type: Literal['Internship', 'Job']) -> Dict:

        try:
            config = {"configurable": {"thread_id": user['email']}}
            initial_state = {
                "skills": user['skills'],
                "location": user['location'],
                "vacancy_type": vacancy_type
            }

            output = await compiled_graph.ainvoke(initial_state, config= config)
            roles_availability = output['messages'][-1].content
            roles = output['current_roles']

            return {
                "roles_availability": roles_availability,
                "current_roles": roles
            }
        except Exception as err:
            return {
                HTTPException(status_code= 500, detail= str(err))
            }

@app.post('/assessment_score')
async def assessment_score(test_data: List[Dict[str, str]]):

    model: ChatGroq = credentials['mistral_s_model']
    parser = PydanticOutputParser(pydantic_object= AnalysisSchema)

    prompt_template = ChatPromptTemplate.from_messages(
        [
            ('system',"""
You are an expert academic evaluator and question-answer analyst. 
Your task is to analyze a user's test performance based on a structured list of dictionaries and provide a comprehensive performance report.
The questions can be either MCQ or paragraph based
### Input Data Format
You will receive a Python-style list of dictionaries. Each dictionary represents a single question and contains the following keys:
- "question_type" : MCQ or Paragraph
- "question": (string) The text of the question.
- "difficulty": (string) The difficulty level (e.g., "Basic", "Intermediate", "Advanced").
- "subject": (string) The specific field or topic of the question.
- "user_answer": (string or boolean) The answer submitted by the user.

### Output Requirements
Analyze the data meticulously and generate a response structured EXACTLY in the following four sections. Do not deviate from this order:

1. SCORE OUT OF 100
This score is evaluated based on the number of correct answer, difficulty level(higher marks for difficult questions.) and question type.
Higher score to the paragraph question.

2. WEAK AREAS
- Identify the subjects or difficulty levels where the user struggled the most (lowest accuracy).
- List specific topics that require immediate review.

3. STRONG AREAS
- Identify the subjects or difficulty levels where the user excelled (highest accuracy).
- Highlight specific fields where the user demonstrated mastery.

4. OVERALL SUMMARY
- Provide a 4-5 sentence holistic evaluation of the user's performance.
- Synthesize how difficulty levels impacted their accuracy (e.g., "Mastered easy concepts but struggled with time management on harder analytical questions").
- Conclude with a clear next step or study recommendation to help them improve.

Maintain a professional, encouraging, and highly analytical tone throughout the report.

{format_instructions}
"""),
            ('human',"""
{test_data}
""")
        ]
    ).partial(
        format_instructions = parser.get_format_instructions()
    )

    chain: Runnable = prompt_template | model | parser
    response = await chain.ainvoke(
        {
            'test_data': test_data
        }
    )

    return response



@app.post('/career_talk')
async def chatbot_guide(payload: CareerChatPayload):
    try:
        result = await career_chat_graph.ainvoke({
            "email": payload.email,
            "message": payload.message,
            "thread_title": payload.thread_title,
            "messages_history": [],
            "final_reply": ""
        })
        return {
            "reply": result["final_reply"],
            "thread_title": result["thread_title"]
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)