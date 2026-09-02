import io
from langchain_mistralai import ChatMistralAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import Runnable
from resume_rag import pdf_embedding_creator
from backend.database.user_db import get_user_db
from fastapi import FastAPI, HTTPException, UploadFile, File
from backend.schemas.schema import AssessmentSchema, AnalysisSchema, ResumeOutputSchema
from backend.langgraph.oppurtunities import compiled_graph
from typing import Dict, List, Any, Literal
from dotenv import load_dotenv
load_dotenv()

async def resume_analyzer(user_file: UploadFile, func_model: ChatGoogleGenerativeAI):

    parser = PydanticOutputParser(pydantic_object= ResumeOutputSchema)
    pdf_bytes = await user_file.read()
    pdf_stream = io.BytesIO(pdf_bytes)

    context = await pdf_embedding_creator(pdf_stream)
    if context:
            prompt = ChatPromptTemplate(
                [
                    ('system',"""

        You are an expert HR Data Extraction Engine. 
        Your job is to analyze the retrieved resume text provided below and extract the candidate's strongest, 
        most prominent skills and fields of expertise, and if any internships done.

        ### Instructions:
        1. Identify technical skills, frameworks, tools, methodologies, and core domain areas where the candidate demonstrates strong proficiency or repeated experience.
        2. Identify whther the candidate has done any internships or not, if yes state them clearly.
        3. Rely ONLY on the provided retrieved text. Do not invent or assume any skills not explicitly mentioned or heavily implied by their listed experience.
        4. Clean the skills (e.g., use standard capitalization like "Python", "React", "AWS").

        {format_instructions}
        """),
                ("human", """The retrieved context is :- 
                {context}""")
            ]
        ).partial(format_instructions= parser.get_format_instructions())
            
            chain = prompt | func_model | parser
            response = await chain.ainvoke(
                {
                    "context": context
                }
            )
            return response
    else:
        return {
            "skills": "No skill found"
        }

async def assessment_generator(user_fields: List[str], func_model: ChatMistralAI):
    
    parser = PydanticOutputParser(pydantic_object= AssessmentSchema)
    prompt_temp = ChatPromptTemplate.from_messages(
        [
            ('system', """
You are an expert Educational Assessment Specialist and Curriculum Designer. 
Your task is to generate a highly targeted, structured questionnaire based on the fields provided by the user.
The user will provide a list of fields, topics, or subjects (e.g., ["Python Programming", "Data Structures"]).

# Instructions & Rules
1. Core Output: You must generate exactly 5 question per field only if the number of question are more than 10. 
Othewise, evenly distribute them to generate 12 questions.
2. If the fields cannot be divided perfectly, distribute them as evenly as possible.
3. Question Types: 
- You must mix Multiple Choice Questions (MCQs) and Short Paragraph Questions.
- Target an approximate 50/50 split (e.g., 6 MCQs and 6 Short Paragraph questions).
4. Format Requirements:
- For MCQs: Provide the question, exactly 4 clear options (labeled A, B, C, D) along with it.
- For Short Paragraphs: Provide a prompt that requires a 3-5 sentence explanatory response, along with "Key Concepts to Look For" to guide the evaluator.
5. Difficulty: Ensure a balanced progression from fundamental concepts to intermediate-level application to 1 advanced question for each field.

{format_instructions}
"""),
            ('human',"""
Here is the list of fields :- {fields}
""")
        ]
    ).partial(format_instructions= parser.get_format_instructions())

    chain: Runnable = prompt_temp | func_model | parser
    response = await chain.ainvoke({
        'fields': user_fields
    })

    return response

async def first_assessment_score(assess_data: List[Dict[str, str]], func_model: ChatGroq):

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
    response = await chain.ainvoke(
        {
            'test_data': assess_data
        }
    )

    return response

