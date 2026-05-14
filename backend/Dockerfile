# Build stage
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

RUN pip install uv

COPY pyproject.toml uv.lock README.md ./

RUN uv sync --no-dev --extra celery

# Production stage
FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/pyproject.toml /app/pyproject.toml
COPY --from=builder /app/uv.lock /app/uv.lock

COPY . .

ENV PYTHONUNBUFFERED=1

# Run the application using the startup script
RUN chmod +x scripts/start.sh
CMD ["./scripts/start.sh"]
