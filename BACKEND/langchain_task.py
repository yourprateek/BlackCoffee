import io
from fastapi import UploadFile
from pypdf import PdfReader
from langchain_google_genai import ChatGoogleGenerativeAI
from schemas.schema import ResumeOutputSchema
from dotenv import load_dotenv

load_dotenv()

async def resume_analyzer_llm(user_file: UploadFile) -> ResumeOutputSchema:
    pdf_bytes = await user_file.read()
    pdf_stream = io.BytesIO(pdf_bytes)

    reader = PdfReader(pdf_stream)
    extracted_text = " ".join([page.extract_text() or "" for page in reader.pages]).strip()

    if not extracted_text:
        raise ValueError("Could not extract any text from the uploaded PDF.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.1
    )
    structured_llm = llm.with_structured_output(ResumeOutputSchema)

    prompt = f"""
    You are a universal HR recruitment and taxonomy engine capable of parsing resumes across any professional discipline (Engineering, Business, Design, Healthcare, Finance, Humanities, etc.).

Analyze the resume text and extract the candidate's core competencies using the following universal normalization rules:

### Universal Skill Normalization Guidelines:
1. **Broader Umbrella Normalization**:
   - Consolidate micro-techniques, hyper-specific architectures, single formula names, or niche sub-components into their standard discipline-level umbrella.
   - Examples:
     * *Tech:* "GRU", "LSTM", "RNN" -> Roll up into **Deep Learning** or **Natural Language Processing**.
     * *Finance:* "DCF", "LBO", "Comparable Company Analysis" -> Roll up into **Financial Modeling** or **Valuation**.
     * *Marketing:* "A/B Testing", "CTR Optimization", "Meta Pixel" -> Roll up into **Performance Marketing** or **Conversion Rate Optimization (CRO)**.
     * *Design:* "Kerning", "Grid Systems", "Moodboards" -> Roll up into **Typography** or **Visual Design**.
   - Keep flagship, industry-standard tools and platforms explicit (e.g., "Python", "SQL", "Figma", "Bloomberg Terminal", "Salesforce", "AutoCAD").

2. **Exclude Meta-Headers and Vague Boilerplate**:
   - Strip out category labels, document headers, and generic task descriptions (e.g., DO NOT extract: "Python Libraries", "Tools Used", "Predictive models", "Client communication", "Team player", "Basic computer knowledge").

3. **Industry Standard Naming & Deduplication**:
   - Eliminate redundant phrasing (e.g., avoid having both "ML" and "Machine Learning"; choose the canonical standard name).
   - Use standard professional capitalization and acronym conventions.

4. **Conciseness & High Signal**:
   - Prioritize high-signal, macro competencies.
   - Avoid bloated lists: aim for roughly 6 to 12 distinct, high-impact skills or recognized tools that define the candidate's core domain.

### Resume Text:
{extracted_text}
    """

    response = await structured_llm.ainvoke(prompt)
    return response