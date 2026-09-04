from datetime import datetime
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Literal, Optional
from uuid import uuid4, UUID

class Location(BaseModel):

    state: Literal[
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
        "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
        "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
        "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", 
        "Ladakh", "Lakshadweep", "Puducherry"
    ]
    city: str
    country: Literal["India"]
    preferred_work_modes: Literal['remote', 'hybrid', 'on-site']

class Education(BaseModel):

    institution: str
    degree: str
    branch: Optional[str]
    graduation_year: int 

class Assessment(BaseModel):

    assessment_id: UUID = Field(default_factory=uuid4)
    assessment_topics: str = ''
    assessment_questions: List[str] = []
    assessment_answers: List[str] = []
    assessment_score: int = None
    assessment_overall_summary: str = ''

class AssessmentsCompleted(BaseModel):

    total_assessments_completed: int = 0
    assessments: List[Assessment] = []

class Skill(BaseModel):
    user_skills: List[str] = Field(
        description= "The skills user claims he/she have achieved.",
        default= []
    )
    verified_skills: List[str] = Field(
        description= "Skils verified after the assessments.",
        default= []
    )

class Experience(BaseModel):

    internships_done: Optional[List[str]] = []
    courses_completed: Optional[List[str]] = []

class UserMetadata(BaseModel):
    
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
    skills: Skill = Field(
        description="Skills acquired by the user and verified by us.",
        default_factory=lambda: Skill(user_skills=[])
    )
    experience: Experience = Field(
        description= "The experience of the user"
    )
    assessment: AssessmentsCompleted = Field(
        description= "The complete details of the assessments given by the user"
    )
    targetted_roles: List[str]

    user_metadata: UserMetadata
