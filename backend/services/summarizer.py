import os
import json

from dotenv import load_dotenv
from openai import OpenAI


# ---------------------------------------------------------
# Load environment
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Groq client
# ---------------------------------------------------------

client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "openai/gpt-oss-120b"


# ---------------------------------------------------------
# Meeting summarizer
# ---------------------------------------------------------

def summarize_meeting(text: str) -> dict:

    if not text or not text.strip():
        return {
            "summary": "",
            "key_points": [],
            "decisions": [],
            "action_items": [],
            "important_dates": []
        }

    # Keep enough transcript for analysis,
    # but avoid sending an excessively large request.
    meeting_text = text[:24000]

    system_prompt = """
You are a meeting summarization assistant.

Read the meeting transcript and return ONLY valid JSON.

Use exactly this format:

{
  "summary": "A concise 3-5 sentence summary.",
  "key_points": [
    "point 1",
    "point 2",
    "point 3"
  ],
  "decisions": [
    "decision 1",
    "decision 2"
  ],
  "action_items": [
    {
      "task": "task",
      "owner": "person or Unknown",
      "deadline": "deadline or Not specified"
    }
  ],
  "important_dates": [
    "date or time"
  ]
}

Rules:

1. Maximum 3 key points.
2. Maximum 2 decisions.
3. Maximum 4 action items.
4. Maximum 3 important dates.
5. Keep every item very short.
6. Do not invent information.
7. If information is not present, use an empty list.
8. Return JSON only.
9. Do not use markdown.
10. Do not explain your answer.
"""


    user_prompt = (
        "Analyze this meeting transcript:\n\n"
        + meeting_text
    )


    try:

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0,
            max_tokens=1200,
            response_format={
                "type": "json_object"
            }
        )

        content = response.choices[0].message.content

        if not content:
            raise ValueError(
                "Groq returned an empty response."
            )

        print("Groq raw response:")
        print(content)

        result = json.loads(content)

        return {
            "summary": str(
                result.get("summary", "")
            ),

            "key_points": result.get(
                "key_points", []
            )[:3],

            "decisions": result.get(
                "decisions", []
            )[:2],

            "action_items": result.get(
                "action_items", []
            )[:4],

            "important_dates": result.get(
                "important_dates", []
            )[:3]
        }


    except Exception as e:

        print("SUMMARIZATION ERROR:")
        print(str(e))

        return {
            "summary": (
                "AI summarization failed. "
                "The transcript was successfully generated."
            ),
            "key_points": [],
            "decisions": [],
            "action_items": [],
            "important_dates": []
        }