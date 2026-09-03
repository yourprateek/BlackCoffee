from pydantic import BaseModel, Field, AnyHttpUrl, EmailStr
from enum import Enum
from typing import List, Dict, Any, Literal, Optional, Tuple
from uuid import UUID

class QuestionItem(BaseModel):
    id: str = Field(description="Unique string ID for the question (e.g., q_1, q_2).")
    field: str = Field(
        description="The field/topic this question belongs to."
    )
    question_type: Literal["MCQ", "Short Paragraph"] = Field(
        description="The type of the question."
    )
    difficulty: Literal["Basic", "Intermediate", "Advanced"] = Field(
        description="Difficulty tier."
    )
    question_text: str = Field(description="The question prompt itself.")

    options: Optional[List[str]] = Field(
        default=None,
        description="For MCQs only. A list of exactly 4 strings labeled A, B, C, D. Leave empty/None for Short Paragraphs.",
    )


class AssessmentSchema(BaseModel):
    assessment_id: UUID
    questions: List[QuestionItem] = Field(
        description="A list of generated assessment questions."
    )

class AnalysisSchema(BaseModel):

    assessment_id: UUID
    score: int = Field(
        description= "Score based on the assessment answers out of 100"
    )
    improvement_areas: List[str] = Field(
        description= "Areas which requires improvement"
    )
    strong_areas: List[str] = Field(
        description= "Areas where user has a strong command"
    )
    test_summary: str = Field(
        description= "A well formatted summary for the user based on his/her performance in the assessment"
    )

class SubmitAssessmentRequest(BaseModel):
    assessment_id: UUID
    answers: Dict[str, str] = Field(...,
        example={"q_1": "A", "q_2": "FastAPI handles routing efficiently."}
    )

class ResumeOutputSchema(BaseModel):
    skills: List[str] = Field(
        description= "Skills or strong areas exracted from the resume"
    )
    internships: Optional[List[str]] = Field(
        description= "Internships done by the user (if any)"
    )
    courses: Optional[List[str]] = Field(
        description= "The courses done by the user."
    )

class VacancyItem(BaseModel):
    role_title: str = Field(
        description= "The title of the internship/jobs"
    )
    company_name: str = Field(
        description= "The name of the company"
    )
    work_location_type: Literal['Remote', 'Hybrid', 'On-site'] = Field(
        description= "The location type of the internship/jobs"
    )
    location: Optional[str] = Field(
            description= "The location of the internship/jobs"
        )
    url: AnyHttpUrl = Field(
        decimal_places= "The source url of the internship/jobs vacancy"
    )
    income_type: Literal['stipend', 'unpaid', 'salary'] = Field(
        decimal_places= "Whether the internship/jobs is paid or not"
    )
    deadline: Optional[str] = Field(
        description= "A short bullet point if visible in the text as a deadline"
    )

class VacanciesSchema(BaseModel):
    vacancies: List[VacancyItem] = Field(
        description= "A list of all the internship/jobs vacancies available"
    )

class MessageType(BaseModel):
    role: Literal['ai', 'human', 'system']
    content: str

class ThreadDetail(BaseModel):
    thread_title: str
    messages: List[MessageType]

class UserChatThreads(BaseModel):
    email: EmailStr
    threads: List[ThreadDetail]

class CareerChatPayload(BaseModel):
    email: EmailStr
    message: str
    thread_title: Optional[str] = None

class CareerChatResponse(BaseModel):
    reply: str
    thread_title: str

class FileModel(BaseModel):
    filename: str
    file_data: bytes  

class DocumentCollectionSchema(BaseModel):

    email: EmailStr
    resume: Optional[FileModel] = Field(
        description="The user's resume",
        default= None
    )
    certificates: List[FileModel] = Field(
        description="The user's certificates",
        default= []
    )