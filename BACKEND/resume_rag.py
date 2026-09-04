import chromadb
from io import BytesIO
from pypdf import PdfReader
from langchain_huggingface.embeddings import HuggingFaceEndpointEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from langchain_mistralai import ChatMistralAI
from fastapi import UploadFile
from langchain_core.documents import Document
from langchain_chroma import Chroma
from typing import List
from dotenv import load_dotenv
load_dotenv()

async def retriever_task(vector_store: Chroma) -> str | None:

    try:
        retriever = vector_store.as_retriever()
        llm = ChatMistralAI(
            model_name= "mistral-small-latest",
            temperature= 0.65
        )

        multi_queries = MultiQueryRetriever.from_llm(
            llm= llm,
            retriever= retriever
        )

        query = "What are the candidate's core areas of expertise and strongest professional skills based on their experience or internships?"\
        "Also, include any courses if they had some."
        retrieved_docs: List[Document] = await multi_queries.ainvoke(query)

        content = [doc.page_content for doc in retrieved_docs]

        return '\n'.join(content)
    except:
        return None

pdf_file = []
async def pdf_embedding_creator(file: BytesIO) -> str:

        client = chromadb.EphemeralClient()
        embedding_model = HuggingFaceEndpointEmbeddings(
                model= "sentence-transformers/all-MiniLM-L6-v2"
            )

        pdf = PdfReader(file)

        for i, page in enumerate(pdf.pages):
            content = page.extract_text()
            if content:
                pdf_file.append(Document(
                    page_content= content, 
                    metadata = {"page_number": i+1}
                ))

        text_of_pdf = ' '.join([doc.page_content for doc in pdf_file])
        total_words = len(text_of_pdf.split())
        
        if total_words < 3000:

            chunk_size = 600  
            chunk_overlap = 120

        elif total_words < 15000:

            chunk_size = 1000 
            chunk_overlap = 200 
        else:

            chunk_size = 2000   
            chunk_overlap = 300

        splitter = RecursiveCharacterTextSplitter(
            chunk_size= chunk_size,
            chunk_overlap= chunk_overlap
        )

        chunks: List[Document] = splitter.split_documents(pdf_file)
        vector_store = await Chroma.afrom_documents(
            documents= chunks,
            embedding = embedding_model,
            client = client
        )

        final_content = await retriever_task(vector_store= vector_store)

        return final_content
    