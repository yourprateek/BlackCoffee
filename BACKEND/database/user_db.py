from database.configurations import profiles_collections, user_docs_collection, user_chat_collections
from fastapi import UploadFile
from schemas.user_schema import User
from schemas.schema import ResumeOutputSchema, FileModel
from pydantic import EmailStr
from datetime import datetime, timezone
from pymongo.errors import DuplicateKeyError
from pymongo import ReturnDocument
from typing import Dict, Any, List

async def get_user_data(email: EmailStr) -> User | Dict:
    try:
        final_email = email.lower().strip()
        
        filter_query = {"email": final_email}
        update_query = {
            "$set": {
                "user_metadata.last_checked_in_at": datetime.now(timezone.utc).isoformat()
            }
        }

        user_dict = await profiles_collections.find_one_and_update(
            filter_query,
            update_query,
            return_document=ReturnDocument.AFTER
        )

        if user_dict: 
            return User(**user_dict)
        return {"error": f"No user exists with email as : {email}"} 
    except Exception as e: 
        print(f"THE HIDDEN ERROR IS: {repr(e)}") 
        return {"error": "An unexpected error occurred"}

async def add_user_to_db(user: User) -> dict:

    new_user = user.model_dump()
    email: EmailStr = new_user['email']
    new_user['email'] = email.lower().strip()
    new_user['acc_created_at'] = datetime.now(timezone.utc).isoformat()

    try:
        await profiles_collections.insert_one(new_user)
        message = f"User created successfully with email: {new_user['email']}"
        return {
            "status_code": 201,
            "message": message
        }
    except DuplicateKeyError:
        return {
            "status_code": 400,
            "message": "An account with this email address already exists."
        }

async def update_assessment(email: EmailStr, new_assessment_data: Dict[str, Any]):

    filter_query = {"email": email}
    try:
        update_query = {
            "$push": {"assessment.assessments": new_assessment_data},
            "$inc": {"assessment.total_assessments_completed": 1}
        }
        await profiles_collections.update_one(filter_query, update_query, upsert=False)
        return {
            'status_code': 200,
            'message': "Updated successfully."
        }
    except Exception as err:
        return {
            'status_code': 500,
            'message': str(err)
        }

async def update_verified_skills(email: EmailStr, skills: List[str]):
    try:
        # Match by email directly
        filter_query = {"email": email}
        
        # Ensure we add elements uniquely to the verified_skills nested array
        update_query = {
            "$addToSet": {
                "skills.verified_skills": {"$each": skills}
            }
        }
        
        # Check if a document actually matched and modified
        result = await profiles_collections.update_one(filter_query, update_query, upsert=False)
        
        if result.matched_count == 0:
            return {'status_code': 404, 'message': "User profile not found."}
            
        return {
            'status_code': 200,
            'message': "Updated successfully."
        }
    except Exception as err:
        return {
            'status_code': 500,
            'message': str(err)
        }


async def add_skills_and_exp(resume_output: Dict[str, Any], email: EmailStr):
    skills_to_add = resume_output.get('skills') or []
    internships_to_add = resume_output.get('internships') or []
    courses_to_add = resume_output.get('courses') or []
    filter_query = {'email':email}
    try:
        update_query = {
            "$addToSet": {
                "skills.user_skills": {"$each": skills_to_add},
                "experience.internships_done": {"$each": internships_to_add},
                "experience.courses_completed": {"$each": courses_to_add}
            }
        }
        await profiles_collections.update_one(filter_query, update_query, upsert=False)
        return {
            'status_code': 200,
            'message': "Updated successfully."
        }
    except Exception as err:
        return {
            'status_code': 500,
            'message': str(err)
        }

async def resume_storage(file: UploadFile, email: EmailStr):

    await file.seek(0)
    file_bytes = await file.read()
    
    if len(file_bytes) > 5 * 1024 * 1024:
        raise ValueError("File exceeds MongoDB's 16MB document size limit.")

    resume_document = {
        "file_name": file.filename,
        "file_data": file_bytes
    }
    try:
        await user_docs_collection.update_one(
            {"email": email},
            {"$set": {"resume": resume_document}},
            upsert=True
        )
        return {
            'status_code': 201,
            'message': "Resume stored successfully!"
        }
    except Exception as err:
        return {
            'status_code': 500,
            'message': str(err)
        }

async def certification_storage(file: UploadFile, email: EmailStr):

    file_bytes = await file.read()
        
    if len(file_bytes) > 5 * 1024 * 1024:
        raise ValueError("File exceeds MongoDB's 16MB document size limit.")

    new_certificate = {
        "filename": file.filename,
        "file_data": file_bytes
    }
    try:
        await user_docs_collection.update_one(
            {"email": email},
            {"$push": {"certificates": new_certificate}},
            upsert=True
        )
        return {
            'status_code': 201,
            'message': "Certificate stored successfully!"
        }
    except Exception as err:
        return {
            'status_code': 500,
            'message': str(err)
        }

async def delete_account(email: EmailStr):

    collections = [user_docs_collection, user_chat_collections, profiles_collections]

    try:
        user_to_delete = email
        filter_query = {'email':email}

        for collection in collections:
            result = await collection.delete_one(filter_query)
            
        if result.deleted_count > 0:
            return f"User with email '{user_to_delete}' has been successfully deleted."

    except:
        return "An unknown error occurred"
