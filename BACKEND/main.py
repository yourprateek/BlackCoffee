from langchain_mistralai import ChatMistralAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import Runnable
from fastapi import FastAPI, HTTPException
from schema import AssessmentSchema, AnalysisSchema
from contextlib import asynccontextmanager
from typing import Dict, List, Any
from dotenv import load_dotenv
load_dotenv()

credentials = {}
@asynccontextmanager
async def site_credentials(app: FastAPI):

    mistral_medium_model = ChatMistralAI(
        model_name= "mistral-medium-latest",
        temperature= 0.6
    )

    gemini_model = ChatGoogleGenerativeAI(
        model= 'gemini-3-flash-preview'
    )

    mistral_small_model = ChatMistralAI(
        model_name= "mistral-small-latest"
    )

    credentials['mistral_m_model'] = mistral_medium_model
    credentials['gemini_model'] = gemini_model
    credentials['mistral_s_model'] = mistral_small_model

    yield credentials

app = FastAPI(title= "BlackCoffee", lifespan= site_credentials)

@app.post('/first_assessment')
async def assessment(fields: List[str]):

    try:
        model: ChatGoogleGenerativeAI = credentials['gemini_model']
        parser = PydanticOutputParser(pydantic_object= AssessmentSchema)
        prompt_temp = ChatPromptTemplate.from_messages(
            [
                ('system', """
    You are an expert Educational Assessment Specialist and Curriculum Designer. 
    Your task is to generate a highly targeted, structured questionnaire based on the fields provided by the user.
    The user will provide a list of fields, topics, or subjects (e.g., ["Python Programming", "Data Structures"]).

    # Instructions & Rules
    1. Core Output: You must generate exactly 4 question per field only if the number of question are more than 10. 
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

        chain: Runnable = prompt_temp | model | parser
        response = await chain.ainvoke({
            'fields': fields
        })

        return response

    except Exception as error:
        return HTTPException(status_code= 404, detail= str(error))


"""Extract 'field', 'difficulty', 'question_text', 'answer' for each question to start the analysis"""

@app.post('/assessment_score')
async def assessment_score(test_data: List[Dict[str, str]]):

    model: ChatGroq = credentials['mistral_s_model']
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

    chain: Runnable = prompt_template | model | parser
    response = await chain.ainvoke(
        {
            'test_data': test_data
        }
    )

    return response
