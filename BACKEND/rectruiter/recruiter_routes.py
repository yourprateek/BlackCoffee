from fastapi import APIRouter, HTTPException, status
from database.configurations import profiles_collections
from schemas.recruiter_schema import CandidateFilterRequest, CandidateProfileCard
from typing import List

router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal"])

@router.post("/candidates", response_model=List[CandidateProfileCard])
async def get_candidates(filters: CandidateFilterRequest):
    """
    Search candidates matching required skills, location, score, and preferences.
    Returns contact information (email/phone) directly so recruiters can reach out themselves.
    """
    query = {}

    if filters.required_skills:
        skill_field = (
            "skills.verified_skills" 
            if filters.only_verified_skills 
            else "skills.user_skills"
        )
        regex_patterns = [f"(?i)^{skill.strip()}$" for skill in filters.required_skills]
        query[skill_field] = {"$in": [{"$regex": pat} for pat in regex_patterns]}

    if filters.state:
        query["location.state"] = {"$regex": f"^{filters.state.strip()}$", "$options": "i"}

    if filters.preferred_work_mode:
        query["location.preferred_work_modes"] = filters.preferred_work_mode

    if filters.min_score is not None:
        query["assessment.assessments.assessment_score"] = {"$gte": filters.min_score}

    try:
        cursor = profiles_collections.find(query).limit(filters.limit)
        candidate_list = []

        async for doc in cursor:
            assessments = doc.get("assessment", {}).get("assessments", [])
            latest_score = assessments[-1].get("assessment_score") if assessments else None

            # Enforce score filter on the latest score specifically
            if filters.min_score is not None and (latest_score is None or latest_score < filters.min_score):
                continue

            card = CandidateProfileCard(
                full_name=doc.get("full_name", "Anonymous"),
                email=doc.get("email"),
                phone_num=doc.get("phone_num"),
                state=doc.get("location", {}).get("state", "Unknown"),
                city=doc.get("location", {}).get("city", "Unknown"),
                preferred_work_modes=doc.get("location", {}).get("preferred_work_modes"),
                user_skills=doc.get("skills", {}).get("user_skills", []),
                verified_skills=doc.get("skills", {}).get("verified_skills", []),
                latest_score=latest_score,
                internships=doc.get("experience", {}).get("internships_done") or [],
                courses_completed=doc.get("experience", {}).get("courses_completed") or []
            )
            candidate_list.append(card)

        return candidate_list

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query candidates: {str(e)}"
        )