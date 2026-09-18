
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.config import Config
from services.llm_service import llm_service


meeting_router = APIRouter(
    prefix="/api/meetings",
    tags=["Meetings"]
)


class MeetingRequest(BaseModel):
    transcript: str | None = None
    filename: str | None = None


class QueryRequest(BaseModel):
    question: str
    transcript: str | None = None
    filename: str | None = None


def load_transcript(filename: str):
    folder = Config.UPLOAD_FOLDER
    name = os.path.basename(filename)

    txt_name = os.path.splitext(name)[0] + ".txt"
    txt_path = os.path.join(folder, txt_name)

    if os.path.isfile(txt_path):
        with open(txt_path, "r", encoding="utf-8") as f:
            return f.read()

    return None


@meeting_router.get("/")
def list_meetings():
    folder = Config.UPLOAD_FOLDER
    os.makedirs(folder, exist_ok=True)

    files = []

    for name in os.listdir(folder):
        path = os.path.join(folder, name)

        if os.path.isfile(path):
            files.append({
                "filename": name,
                "size": os.path.getsize(path)
            })

    return {
        "success": True,
        "files": files
    }


@meeting_router.post("/summarize")
def summarize(data: MeetingRequest):

    transcript = data.transcript

    if not transcript and data.filename:
        transcript = load_transcript(data.filename)

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Send transcript, or filename of the .txt file in uploads"
        )

    summary = llm_service.summarize_meeting(transcript)

    return {
        "success": True,
        "summary": summary
    }


@meeting_router.post("/query")
def query_meeting(data: QueryRequest):

    transcript = data.transcript

    if not data.question:
        raise HTTPException(
            status_code=400,
            detail="question is required"
        )

    if not transcript and data.filename:
        transcript = load_transcript(data.filename)

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Send transcript, or filename of the .txt file in uploads"
        )

    answer = llm_service.answer_query(
        transcript,
        data.question
    )

    return {
        "success": True,
        "answer": answer
    }

