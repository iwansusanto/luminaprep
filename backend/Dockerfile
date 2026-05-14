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

# Install dependencies using uv pip
# Using --system installs directly into the container's Python environment
RUN uv pip install --system --no-cache -r pyproject.toml --extra celery

# Copy the rest of the application
COPY . .

# Install the project itself in editable mode or just its dependencies
RUN uv pip install --system --no-cache -e .

# Expose the port for FastAPI
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

# Run the application using the startup script
RUN chmod +x scripts/start.sh scripts/worker.sh
CMD ["./scripts/start.sh"]
