# Build stage
FROM python:3.11-slim-bookworm AS builder

# Install uv
RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./

RUN uv pip install --system --no-cache -r pyproject.toml --extra celery

# Production stage
FROM python:3.11-slim-bookworm

# Install uv
RUN pip install --no-cache-dir uv

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1

# Run the application using the startup script
RUN chmod +x scripts/start.sh scripts/worker.sh
CMD ["./scripts/start.sh"]
