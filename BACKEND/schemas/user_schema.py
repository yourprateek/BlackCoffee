from datetime import datetime
from pydantic import BaseModel, Field, AnyHttpUrl, EmailStr
from enum import Enum
from typing import List, Dict, Any, Literal, Optional
from uuid import uuid4
from bson.binary import Binary

STATES_AND_UTS_INDIA = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
    "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
    "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
    "Ladakh", "Lakshadweep", "Puducherry"
]

class Location(BaseModel):

    state: str = Literal[STATES_AND_UTS_INDIA]
    city: str = str
    country: Literal["India"]
    preferred_work_modes: Literal['remote', 'hybrid', 'on-site']

class Education(BaseModel):

    institution: str
    degree: str
    branch: Optional[str] = ' 
    graduation_year: int 

class Assessment(BaseModel):

    assessment_id: uuid4
    assessment_topic: str
    assessment_questions: List[str]
    assessment_answers: List[str]
    assessment_score: int 
    assessment_overall_summary: str

class AssessmentsCompleted(BaseModel):

    total_assessments_completed: int
    assessments_topic: List[str]
    assessmnents: List[Assessment]

class Certificate(BaseModel):
    filename: str
    file_data: bytes 

class Experience(BaseModel):

    internships_done: Optional[List[str]] = []
    certifications: Optional[List[Certificate]] = Field(default_factory= List)

class UserMetadata(BaseModel):

    resume_file: Optional[Binary]
    acc_created_at: datetime
    last_checked_in_at: datetime

class User(BaseModel):

    full_name: str = Field(
        description= "The name of the user"
    )
    email: EmailStr = Field(
        description= "The email of the user"
    )
    phone_num: str

    location: Location = Field(
        description= "The location details of the user"
    )
    education: Education = Field(
        description= "The education details of the user"
    )
    skills: List[str] = Field(
        description= "Skills acquired/ practiced by the user"
    )
    Experience: Experience = Field(
        description= "The experience of the user"
    )
    assessment: AssessmentsCompleted = Field(
        description= "The complete details of the assessments given by the user"
    )
    targetted_roles: List[str] = []

    user_metadata: UserMetadata
