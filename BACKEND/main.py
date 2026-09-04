import io
from rich import print
from rectruiter.recruiter_routes import router
from langchain_task import resume_analyzer_llm
from database.configurations import user_chat_collections, profiles_collections, user_docs_collection
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import EmailStr
from schemas.schema import CareerChatPayload
from contextlib import asynccontextmanager
from schemas.user_schema import User
from database.user_db import (get_user_data, add_user_to_db, update_assessment, 
update_verified_skills, resume_storage, certification_storage, add_skills_and_exp, delete_account)
from langgraph.oppurtunities import compiled_graph
from langgraph.skill_dev import skill_builder
from langgraph.career_chat_db import career_chat_graph
from langgraph.assessment import assessment_builder
from typing import Dict, List, Any, Literal, Annotated
from dotenv import load_dotenv
from uuid import uuid4
from fastapi.responses import StreamingResponse
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await profiles_collections.create_index('email', unique=True)
    await user_chat_collections.create_index('email')
    await user_docs_collection.create_index('email')
    yield

app = FastAPI(title= "BlackCoffee", lifespan= lifespan)

@app.get('/get_user_info')
async def get_user(user_email: EmailStr) -> Dict[str, Any]:

    try:
        user_data = await get_user_data(email=user_email)
        
        if isinstance(user_data, dict):
            return user_data
            
        return user_data.model_dump()
    except Exception:
        raise HTTPException(status_code=500, detail="Internal Server Error")

UserDependency = Annotated[dict, Depends(get_user)]

@app.get('/all_threads')
async def get_all_threads(user: UserDependency) -> List[str]:

    try:
        all_chat_threads = await user_chat_collections.find_one(
            {'email': user['email']},
            {'email': 0, 'threads': 1}
        )

        all_thread_titles = [thread['thread_title'] for thread in all_chat_threads]
        return all_thread_titles
    except Exception as err:
        raise HTTPException(status_code= 500, detail= str(err))

@app.get('/user_experience_and_skills')
async def get_user_exp_and_skills(user: UserDependency):

    try:
        exp_and_skill = await profiles_collections.find_one(
            {'email': user['email']},
            {'experience': 1, 'skills': 1, '_id': 0}
        )
        user_courses: List[str] = exp_and_skill.get('experience', {}).get('courses_completed') or []
        user_internships: List[str] = exp_and_skill.get('experience', {}).get('internships_done') or []

        user_skills: List[str] = exp_and_skill.get('skills', {}).get('user_skills') or []
        verified_skills: List[str] = exp_and_skill.get('skills', {}).get('verified_skills') or []

        return user_internships, user_courses, user_skills, verified_skills 
    
    except Exception as err:
        raise HTTPException(status_code= 500, detail= str(err))

@app.get('/user_resume')
async def get_resume(user: UserDependency):

    try:
        document = await user_docs_collection.find_one({"email": user['email']}, {"resume": 1})
        
        if not document or not document.get("resume"):
            raise HTTPException(status_code=404, detail="Resume not found for this user.")
        
        resume_data = document["resume"]
        file_bytes = bytes(resume_data.get("file_data", b""))
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=resume_data.get("content_type", "application/pdf"),
            headers={"Content-Disposition": f'attachment; filename="{resume_data["file_name"]}"'}
        )
    except:
        return "No resume found."

@app.get('/user_certificates')
async def get_certificate(user: UserDependency, filename: str):
    try:
        document = await user_docs_collection.find_one(
            {"email": user['email'], "certificates.filename": filename},
            {"certificates.$": 1}
        )
        if not document or not document.get("certificates"):
            raise HTTPException(status_code=404, detail="Certificate file not found.")

        certificate_data = document["certificates"][0]

        return StreamingResponse(
            io.BytesIO(certificate_data["file_data"]),
            headers={"Content-Disposition": f'attachment; filename="{certificate_data["filename"]}"'}
        )
    except:
        return "No certificates found."


@app.get('/skill_sources')
async def skill_dev(user: UserDependency,
    skill_name: str = Query(
        default=None,
        max_length=50,
        min_length=1,
        description='Enter skill you want to learn'
    ),
    filter_paid_courses: bool = Query(
        default=True,
        description="Select paid courses"
    )
):

    try:
        config = {"configurable": {"thread_id": user['email']}}
        initial_state = {
                'paid_filter': filter_paid_courses,
                'skill': skill_name
            }
        await skill_builder.ainvoke(initial_state, config= config)

        output = skill_builder.get_state(config)

        courses_available = output.values.get('courses_available')
        conclusion = output.values.get('conclusion')

        return {
            'courses_available': courses_available,
            'conclusion': conclusion
        }
    except Exception as err:
        raise HTTPException(status_code= 400, detail= str(err))

@app.post('/add_certificate')
async def store_certificate(user: UserDependency, file: UploadFile = File(...)):

    resp = await certification_storage(file, user['email'])
    if resp['status_code'] == 500:
        return {
            'status_code': 500,
            'message': resp['message']
        }
    return resp
    
@app.post('/user_account_creation')
async def create_account(user: User) -> Dict:

    resp = await add_user_to_db(user)

    if resp['status_code'] == 400:
        raise HTTPException(status_code=400, detail=resp['message'])
    
    return {
        'status_code': resp['status_code'],
        'detail': resp['message']
    }
    
@app.get('/oppurtunities')
async def job_intern_recommender(
    user: UserDependency, 
    vacancy_type: Literal['Internship', 'Job']
):
        try:
            config = {"configurable": {"thread_id": str(user['email'])}}
            initial_state = {
                "skills": user['skills']['user_skills'],
                "location": user['location'],
                "vacancy_type": vacancy_type
            }
            await compiled_graph.ainvoke(initial_state, config= config)

            output = compiled_graph.get_state(config)
            roles_availability = output.values.get('messages')[-1].content
            roles = output.values.get('current_roles')

            return {
                "roles_availability": roles_availability,
                "current_roles": roles
            }
        except Exception as err:
            raise HTTPException(status_code= 400, detail= str(err))

@app.post('/resume_upload')
async def skill_extractor(user: UserDependency, file: UploadFile = File(...)):

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Only PDF files are allowed."
        )

    try:
        response = await resume_analyzer_llm(user_file= file)
        response_dict = response.model_dump()
        await resume_storage(file, user['email'])
        await add_skills_and_exp(response_dict, user['email'])
        return {
            'message1': 'User skills, experience, courses extracted successfully!',
            'message2': 'Resume stored successfully!'
        }
    
    except Exception as error:
        raise HTTPException(status_code= 422, detail= str(error))

@app.post('/initial_assessment')
async def start_assessment(topics: List[str], user: UserDependency):

    new_assessment_id = uuid4()
    config = {"configurable": {"thread_id": str(new_assessment_id)}}

    initial_state = {
        "email": user['email'],
        "topics": topics,
        "assessment_id": new_assessment_id,
        "questions": [],
        "user_answers": {}
    }

    try:
        await assessment_builder.ainvoke(initial_state, config=config)
        current_state = await assessment_builder.aget_state(config)

        return {
            "assessment_id": new_assessment_id,
            "questions": current_state.values.get("questions", [])
        }
    except Exception as err:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize assessment framework: {str(err)}"
        )
    
@app.post('/assessment_score')
async def submit_assessment(assessment_id: str, user_answers: Dict[str, str], user: UserDependency):

    config = {"configurable": {"thread_id": str(assessment_id)}}
    current_state = await assessment_builder.aget_state(config)
    
    if not current_state.values:
        raise HTTPException(
            status_code=404, 
            detail="Assessment session not found. It may have expired or the ID is invalid."
        )
        
    await assessment_builder.aupdate_state(config, {"user_answers": user_answers}, as_node="assessment_generator")
    
    await assessment_builder.ainvoke(None, config=config)

    final_state = await assessment_builder.aget_state(config)
    final_report = final_state.values.get("analysis")
    score = final_report.score

    flattened_questions = [
        q.question_text if hasattr(q, 'question_text') else q.get('question_text', str(q)) 
        for q in final_state.values.get('questions', [])
    ]
    sequential_answers = list(final_state.values.get('user_answers', {}).values())

    assessment_data = {
        'assessment_id': str(assessment_id),
        'assessment_topics': ', '.join(final_state.values.get('topics', [])),
        
        'assessment_questions': flattened_questions,
        'assessment_answers': sequential_answers,
        
        'assessment_score': int(score),
        'assessment_overall_summary': final_report.test_summary if hasattr(final_report, 'test_summary') else str(final_report)
    }

    resp_1 = await update_assessment(user['email'], assessment_data)

    if score < 75:
        skill_verification_status = "Sorry! You didn't pass the minimum percentage to verify your skills. "\
            "Dont worry! Revise your concepts and come again to give the assessment."
    else:
        skill_verification_status = "Congratulations! You passed the assessment test. "
        verified_skills = final_state.values.get('topics')
        await update_verified_skills(user['email'], verified_skills)

    if resp_1['status_code'] == 500:
        return {
        'test_report': final_report,
        'skill_verification_status': skill_verification_status,
        'storing_issue': HTTPException(status_code= 500, detail= str(resp_1['message']))
    }
    return {
        'test_report': final_report,
        'skill_verification_status': skill_verification_status
    }
    
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

@app.delete('/delete_account')
async def delete_user(user: UserDependency):

    resp = await delete_account(user['email'])
    return resp

app.include_router(router)
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_methods = ["*"],
    allow_headers = ["*"]
)