
import os

from dotenv import load_dotenv
from groq import Groq


# =========================================================
# LOAD ENVIRONMENT
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise ValueError(
        f"GROQ_API_KEY is not set.\nChecked: {ENV_PATH}"
    )


# =========================================================
# GROQ CLIENT
# =========================================================

client = Groq(api_key=API_KEY)


# =========================================================
# SPEECH TO TEXT
# =========================================================

def transcribe_audio(filepath: str) -> str:

    if not os.path.exists(filepath):
        raise FileNotFoundError(
            f"Audio file not found: {filepath}"
        )

    with open(filepath, "rb") as audio_file:

        transcription = client.audio.transcriptions.create(
            file=audio_file,
            model="whisper-large-v3-turbo",
            response_format="text"
        )

    # Groq can return the transcription as text
    if isinstance(transcription, str):
        return transcription.strip()

    # Fallback if SDK returns an object
    text = getattr(transcription, "text", "")

    return text.strip()

