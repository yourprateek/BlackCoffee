import json
from ..database.configurations import user_chat_collections
from ..schemas.user_schema import User
from ..database.user_db import get_user_data
from ..schemas.schema import QuestionItem, AssessmentSchema, AnalysisSchema
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain_groq import ChatGroq
from pydantic import EmailStr, BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from typing import List, TypedDict, Optional, Annotated, Dict
from uuid import UUID

class AssessmentState(BaseModel):
    email: EmailStr
    topics: List[str]
    assessment_id: Optional[UUID] = None
    questions: List[QuestionItem] = []
    user_answers: Dict[str, str] = {}
    analysis: Optional[AnalysisSchema] = None

async def assessment_generator(state: AssessmentState):

    func_model = ChatMistralAI(
        model_name= 'mistral-medium-latest',
        temperature= 0.65
    )
    parser = PydanticOutputParser(pydantic_object= AssessmentSchema)
    prompt_temp = ChatPromptTemplate.from_messages(
        [
            ('system', """
You are an expert Educational Assessment Specialist and Curriculum Designer. 
Your task is to generate a highly targeted, structured questionnaire based on the fields provided by the user.
The user will provide a list of fields, topics, or subjects (e.g., ["Python Programming", "Data Structures"]).

# Instructions & Rules
1. Core Output: You must generate evenly distributed questions per field to generate 15-20 questions.
2. If the fields cannot be divided perfectly, distribute them as evenly as possible.
3. Question Types: 
- You must mix Multiple Choice Questions (MCQs) and Short Paragraph Questions.
- Target an approximate 40/60 split (40 for MCQs and 60 for Paragrah Questions).
4. Format Requirements:
- For MCQs: Provide the question, exactly 4 clear options (labeled A, B, C, D) along with it.
- For Short Paragraphs: Provide a prompt that requires a 3-5 sentence explanatory response.
5. Difficulty: Ensure a balanced progression from fundamental concepts to intermediate-level application to 2-3 advanced question for each field.

{format_instructions}
"""),
            ('human',"""
Here is the list of fields :- {fields}
""")
        ]
    ).partial(format_instructions= parser.get_format_instructions())

    chain: Runnable = prompt_temp | func_model | parser
    result: AssessmentSchema = await chain.ainvoke({"fields": state.topics})
    return {
        'questions': result.questions
    }


async def assessment_score(state: AssessmentState):

    func_model = ChatGroq(
        model= 'openai/gpt-oss-120b',
        temperature= 0.5
    )
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

    chain: Runnable = prompt_template | func_model | parser

    formatted_test_data = []
    for q in state.questions:
        user_ans = state.user_answers.get(q.id, "No answer provided")
        test_item = {
            "question_type": q.question_type,
            "question": q.question_text,
            "difficulty": q.difficulty,
            "subject": q.field,
            "user_answer": user_ans
        }
        formatted_test_data.append(test_item)

    test_data_string = json.dumps(formatted_test_data, indent=2)
    result: AnalysisSchema = await chain.ainvoke({"test_data": test_data_string})

    result.assessment_id = state.assessment_id
    return {
        'analysis': result
    }

graph = StateGraph(AssessmentState)

graph.add_node("assessment_generator", assessment_generator)
graph.add_node("assessment_score", assessment_score)

graph.add_edge(START, "assessment_generator")
graph.add_edge("assessment_generator", "assessment_score")
graph.add_edge("assessment_score", END)

memory = MemorySaver()
assessment_builder = graph.compile(
    checkpointer=memory,
    interrupt_after=["assessment_generator"]
)