from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal

class CandidateFilterRequest(BaseModel):
    required_skills: List[str] = Field(
        ...,
        description="Skills that candidates must possess",
        example=["FastAPI", "Python"]
    )
    only_verified_skills: bool = Field(
        default=False,
        description="If True, filters only candidates whose skills are tested and verified"
    )
    state: Optional[str] = Field(
        default=None,
        description="Filter by candidate state/location",
        example="Delhi"
    )
    min_score: Optional[int] = Field(
        default=None,
        ge=0,
        le=100,
        description="Filter candidates with an assessment score >= this threshold",
        example=75
    )
    preferred_work_mode: Optional[Literal["remote", "hybrid", "on-site"]] = Field(
        default=None,
        description="Filter by candidate's preferred work mode"
    )
    limit: int = Field(default=20, ge=1, le=100)

class CandidateProfileCard(BaseModel):
    full_name: str
    email: EmailStr
    phone_num: Optional[str] = None
    state: str
    city: str
    preferred_work_modes: Optional[str] = None
    user_skills: List[str]
    verified_skills: List[str]
    latest_score: Optional[int] = None
    internships: List[str] = []
    courses_completed: List[str] = []