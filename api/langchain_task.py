import io
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.runnables import Runnable
from resume_rag import pdf_embedding_creator
from fastapi import UploadFile
from backend.schemas.schema import ResumeOutputSchema
from dotenv import load_dotenv
load_dotenv()

async def resume_analyzer_llm(user_file: UploadFile):

    parser = PydanticOutputParser(pydantic_object= ResumeOutputSchema)
    func_model = ChatGoogleGenerativeAI(
        model = 'gemini-3-flash-preview'
    )
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
            
            chain: Runnable = prompt | func_model | parser
            response = await chain.ainvoke(
                {
                    "context": context
                }
            )
            return response
    else:
        raise ValueError('An unknown error occurred')