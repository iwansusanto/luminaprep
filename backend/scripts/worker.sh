#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Celery worker..."
# Use uv run to ensure the environment is correctly handled
exec uv run celery -A app.celery_app worker --loglevel=info
