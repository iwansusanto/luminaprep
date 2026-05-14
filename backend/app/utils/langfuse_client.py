from langfuse import Langfuse
from app.core.config import settings

langfuse = Langfuse(
    public_key=settings.langfuse_public_key,
    secret_key=settings.langfuse_secret_key,
    host=settings.langfuse_host,
)


def trace(name: str, **kwargs):
    return langfuse.trace(name=name, **kwargs)


def span(trace_obj, name: str, **kwargs):
    return trace_obj.span(name=name, **kwargs)


def generation(trace_obj, name: str, model: str, input_data, **kwargs):
    return trace_obj.generation(name=name, model=model, input=input_data, **kwargs)


def flush():
    langfuse.flush()
