import os
import subprocess

from fastapi import APIRouter, UploadFile, File, HTTPException
from werkzeug.utils import secure_filename

from config.config import Config
from services.document_processor import extract_text
from services.text_cleaner import clean_meeting_text
from services.summarizer import summarize_meeting
from services.speech_to_text import transcribe_audio


upload_router = APIRouter(
    prefix="/api/upload",
    tags=["Upload"]
)


ALLOWED_EXTENSIONS = {
    "txt",
    "pdf",
    "docx",
    "mp3",
    "wav",
    "m4a"
}


AUDIO_EXTENSIONS = {
    "mp3",
    "wav",
    "m4a"
}


FFMPEG_PATH = (
    r"C:\Users\Digi Opia\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.1-full_build-shared\bin\ffmpeg.exe"
)


def allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def get_extension(filename: str) -> str:
    return filename.rsplit(".", 1)[1].lower()


def convert_audio_to_mp3(input_path: str, output_path: str):
    if not os.path.exists(FFMPEG_PATH):
        raise FileNotFoundError(
            "FFmpeg was not found. Please check the FFmpeg installation."
        )

    command = [
        FFMPEG_PATH,
        "-y",
        "-i",
        input_path,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "64k",
        output_path,
    ]

    subprocess.run(
        command,
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )


@upload_router.post("/")
async def upload_file(file: UploadFile = File(...)):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No selected file"
        )

    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=(
                "File type not allowed. "
                "Supported files: TXT, PDF, DOCX, MP3, WAV, M4A."
            )
        )

    filename = secure_filename(file.filename)

    upload_folder = Config.UPLOAD_FOLDER
    os.makedirs(upload_folder, exist_ok=True)

    filepath = os.path.join(upload_folder, filename)

    try:

        # -----------------------------------
        # 1. Save uploaded file
        # -----------------------------------

        file_content = await file.read()

        with open(filepath, "wb") as buffer:
            buffer.write(file_content)

        extension = get_extension(filename)

        # -----------------------------------
        # 2. Extract text
        # -----------------------------------

        if extension in AUDIO_EXTENSIONS:

            # WAV / M4A / MP3
            # Convert everything to MP3 for reliable transcription

            transcription_file = filepath

            if extension != "mp3":

                mp3_filename = os.path.splitext(filename)[0] + "_converted.mp3"

                transcription_file = os.path.join(
                    upload_folder,
                    mp3_filename
                )

                convert_audio_to_mp3(
                    filepath,
                    transcription_file
                )

            extracted_text = transcribe_audio(
                transcription_file
            )

        else:

            # TXT / PDF / DOCX

            extracted_text = extract_text(
                filepath
            )

        # -----------------------------------
        # 3. Validate extracted text
        # -----------------------------------

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No readable text was found in the uploaded file."
            )

        # -----------------------------------
        # 4. Clean transcript
        # -----------------------------------

        cleaned_text = clean_meeting_text(
            extracted_text
        )

        if not cleaned_text or not cleaned_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No usable text remained after cleaning."
            )

        # -----------------------------------
        # 5. Generate AI meeting summary
        # -----------------------------------

        meeting_result = summarize_meeting(
            cleaned_text
        )

        # -----------------------------------
        # 6. Return result to React
        # -----------------------------------

        return {
            "success": True,
            "message": "Meeting processed successfully",

            "filename": filename,

            "file_type": extension,

            "transcript": cleaned_text,

            "summary": meeting_result.get(
                "summary",
                ""
            ),

            "key_points": meeting_result.get(
                "key_points",
                []
            ),

            "decisions": meeting_result.get(
                "decisions",
                []
            ),

            "action_items": meeting_result.get(
                "action_items",
                []
            ),

            "important_dates": meeting_result.get(
                "important_dates",
                []
            )
        }

    except HTTPException:
        raise

    except subprocess.CalledProcessError as e:

        raise HTTPException(
            status_code=500,
            detail="Audio conversion failed. Please check the audio file."
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        # Remove temporary converted MP3
        # after transcription is complete

        if (
            "transcription_file" in locals()
            and transcription_file != filepath
            and os.path.exists(transcription_file)
        ):
            try:
                os.remove(transcription_file)
            except Exception:
                pass