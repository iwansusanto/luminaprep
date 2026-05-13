from app.core.config import settings
from openai import OpenAI

oa_client = OpenAI(
    api_key=settings.OPENAI_API_KEY, 
    base_url=settings.OPENAI_BASE_URL,
    default_headers={
        "HTTP-Referer": "https://luminaprep.my.id",
        "X-Title": "LuminaPrep",
    }
)
