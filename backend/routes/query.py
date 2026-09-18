from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_service import ask_meeting_question

query_router = APIRouter(
    prefix="/api/meetings",
    tags=["Meeting Q&A"]
)


class QuestionRequest(BaseModel):
    question: str
    transcript: str


@query_router.post("/query")
async def ask_question(request: QuestionRequest):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    if not request.transcript.strip():
        raise HTTPException(
            status_code=400,
            detail="Meeting transcript is required."
        )

    try:
        answer = ask_meeting_question(
            request.question,
            request.transcript
        )

        return {
            "success": True,
            "answer": answer
        }

    except Exception as e:
        import traceback

        print("========== Q&A ERROR ==========")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {e}")
        traceback.print_exc()
        print("================================")

        raise HTTPException(
            status_code=500,
            detail=f"Q&A error: {str(e)}"
        )