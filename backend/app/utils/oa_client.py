from app.core.config import settings

if (
    settings.langfuse_enabled
    and settings.langfuse_public_key
    and settings.langfuse_secret_key
):
    from langfuse.openai import OpenAI
else:
    from openai import OpenAI

oa_client = OpenAI(
    api_key=settings.OPENAI_API_KEY,
    base_url=settings.OPENAI_BASE_URL,
    default_headers={
        "HTTP-Referer": "https://luminaprep.my.id",
        "X-Title": "LuminaPrep",
    },
)
