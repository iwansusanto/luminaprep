FROM python:3.11-slim-bookworm

# Install uv
RUN pip install uv

# Set working directory
WORKDIR /app

# Install system dependencies (libgomp1 is required by many ML libraries like torch/sentence-transformers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock README.md ./

# Install dependencies including celery extra for task processing
RUN uv sync --no-dev --extra celery

# Copy the rest of the application
COPY . .

# Expose the port for FastAPI
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:$PATH"

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
