FROM python:3.11-slim-bookworm

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Install system dependencies (libgomp1 is required by many ML libraries like torch/sentence-transformers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock README.md ./

# Install dependencies including celery extra for task processing
# Use --no-install-project to avoid failure when app/ source is not yet copied
RUN uv sync --frozen --no-dev --extra celery --no-install-project

# Copy the rest of the application
COPY . .

# Final sync to install the project package itself
RUN uv sync --frozen --no-dev --extra celery

# Expose the port for FastAPI
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
