import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class NoOpLangfuseObject:
    def __bool__(self) -> bool:
        return False

    def update(self, **kwargs: Any) -> None:
        return None

    def span(self, **kwargs: Any) -> "NoOpLangfuseObject":
        return self

    def generation(self, **kwargs: Any) -> "NoOpLangfuseObject":
        return self


class NoOpLangfuse:
    def trace(self, **kwargs: Any) -> NoOpLangfuseObject:
        return NoOpLangfuseObject()

    def flush(self) -> None:
        return None


def _build_langfuse_client():
    if (
        not settings.langfuse_enabled
        or not settings.langfuse_public_key
        or not settings.langfuse_secret_key
    ):
        return NoOpLangfuse()

    try:
        from langfuse import Langfuse

        return Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
    except Exception as exc:  # noqa: BLE001 - observability must never break app startup.
        logger.warning("Langfuse disabled: failed to initialize client: %s", exc)
        return NoOpLangfuse()


langfuse = _build_langfuse_client()


def trace(name: str, **kwargs: Any):
    return langfuse.trace(name=name, **kwargs)


def span(trace_obj, name: str, **kwargs: Any):
    if not trace_obj:
        return NoOpLangfuseObject()
    return trace_obj.span(name=name, **kwargs)


def generation(trace_obj, name: str, model: str, input_data, **kwargs: Any):
    if not trace_obj:
        return NoOpLangfuseObject()
    return trace_obj.generation(name=name, model=model, input=input_data, **kwargs)


def flush() -> None:
    langfuse.flush()
