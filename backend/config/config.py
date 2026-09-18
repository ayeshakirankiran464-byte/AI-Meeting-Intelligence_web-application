import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")

    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB max upload

    # LLM Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    HF_TOKEN = os.getenv("HF_TOKEN")
    