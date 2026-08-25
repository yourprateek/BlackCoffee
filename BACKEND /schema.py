from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Dict, Any, Literal, Optional

class QuestionItem(BaseModel):
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
    key_concepts: Optional[List[str]] = Field(
        default=None,
        description="For Short Paragraphs only. List of key concepts to look for. Leave empty/None for MCQs.",
    )


class AssessmentSchema(BaseModel):
    questions: List[QuestionItem] = Field(
        description="A list of generated assessment questions."
    )

class AnalysisSchema(BaseModel):
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
