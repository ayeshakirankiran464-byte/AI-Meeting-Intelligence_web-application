import re


def clean_meeting_text(text: str) -> str:
    if not text:
        return ""

    # Remove HTML/XML tags
    text = re.sub(r"<[^>]+>", " ", text)

    # Remove URLs
    text = re.sub(
        r"https?://\S+|www\.\S+",
        " ",
        text,
        flags=re.IGNORECASE
    )

    # Remove hashtag symbols but preserve the word
    # Example: #ProjectMeeting -> ProjectMeeting
    text = re.sub(r"#([A-Za-z0-9_]+)", r"\1", text)

    # Remove excessive markdown symbols
    text = re.sub(r"[*_~`]+", " ", text)

    # Normalize whitespace
    text = re.sub(r"\s+", " ", text)

    # Remove repeated punctuation
    text = re.sub(r"([.!?,])\1+", r"\1", text)

    return text.strip()
