from openai import OpenAI
from config.config import Config


class LLMService:

    def __init__(self):
        # Get Groq API key from config
        self.groq_api_key = Config.GROQ_API_KEY
        self.hf_token = Config.HF_TOKEN

        # Groq uses an OpenAI-compatible API
        if self.groq_api_key:
            self.groq_client = OpenAI(
                api_key=self.groq_api_key,
                base_url="https://api.groq.com/openai/v1"
            )
        else:
            self.groq_client = None

    def generate_with_groq(
        self,
        prompt: str,
        model: str = "openai/gpt-oss-120b"
    ) -> str:

        if not self.groq_client:
            return "Error: GROQ_API_KEY is missing in .env file"

        try:
            response = self.groq_client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a helpful AI assistant "
                            "specialized in meeting intelligence."
                        )
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Groq Error: {str(e)}"

    def summarize_meeting(self, transcript: str) -> str:

        prompt = f"""
Please summarize the following meeting transcript.

Include:

- Key discussion points
- Decisions made
- Action items
- Important deadlines

Transcript:
{transcript}
"""

        return self.generate_with_groq(prompt)

    def answer_query(self, transcript: str, question: str) -> str:

        prompt = f"""
Based on the following meeting transcript, answer this question:

Question:
{question}

Transcript:
{transcript}

Give a clear and concise answer.
"""

        return self.generate_with_groq(prompt)


# Create global LLM service instance
llm_service = LLMService()