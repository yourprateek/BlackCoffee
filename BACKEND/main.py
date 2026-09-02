from langchain_task import resume_analyzer, first_assessment_generator
from langchain_mistralai import ChatMistralAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import Runnable
from resume_rag import pdf_embedding_creator, resume_storage
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import EmailStr
from schemas.schema import AssessmentSchema, AnalysisSchema, ResumeOutputSchema
from schemas.user_schema import User
from database.user_db import get_user_data, add_user_to_db
from contextlib import asynccontextmanager
from backend.langgraph.oppurtunities import compiled_graph
from langgraph.skill_dev import skill_builder
from typing import Dict, List, Any, Literal, Annotated
from dotenv import load_dotenv
load_dotenv()

credentials = {}
@asynccontextmanager
async def site_credentials(app: FastAPI):

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

@app.get('/skill_sources')
async def skill_dev(skill_name: str = Query(
    default=None,
    max_length=50,
    min_length=1,
    description='Enter skill you want to learn'
    ),
    filter_paid_courses: bool = Query(
        default=True,
        description="Select paid courses or free courses"
    )
):
    initial_state = {
        'paid_filter': filter_paid_courses,
        'skill': skill_name
    }

    try:
        response = await skill_builder.ainvoke(initial_state)
        courses_available = response['courses_available']
        conclusion = response['summary']

        return {
            'courses_available': courses_available,
            'conclusion': conclusion
        }
    except Exception as err:
        raise HTTPException(status_code= 400, detail= str(err))

@app.post('user_account_creation')
async def create_account(user: User) -> str:

    user_account_dict = user.model_dump()
    try:
        add_user_to_db(user_account_dict)
    except Exception as error:
        raise HTTPException(status_code=400, detail= str(error))
    return "Account created successfully."

@app.get('/oppurtunities')
async def job_intern_recommender(
    user: UserDependency, 
    vacancy_type: Literal['Internship', 'Job'],
    location_filter: bool = Query(
        default=True,
        description="Whether to show oppurtunities near you or not"
    )
):
        try:
            initial_state = {
                "skills": user['skills'],
                "location": user['location'],
                "vacancy_type": vacancy_type
            }

            output = await compiled_graph.ainvoke(initial_state)
            roles_availability = output['messages'][-1].content
            roles = output['current_roles']

            return {
                "roles_availability": roles_availability,
                "current_roles": roles
            }
        except Exception as err:
            raise {
                HTTPException(status_code= 400, detail= str(err))
            }

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
        raise HTTPException(status_code= 400, detail= str(error))

@app.post('/initial_assessment')
async def assessment(user: UserDependency):

    model: ChatMistralAI = credentials['mistral_m_model']
    fields: List[str] = user['skills']
    try:
        response = first_assessment_generator(user_fields= fields, func_model= model)

        return response
    except Exception as error:
        raise HTTPException(status_code= 404, detail= str(error))

@app.post('/assessment_score')
async def assessment_score(test_data: List[Dict[str, str]]):
    model: ChatGroq = credentials['mistral_s_model']
    
@app.post('/career_talk')
async def chatbot_guide():
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)