#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Checking for migrations..."
if [ -d "alembic/versions" ] && [ "$(ls -A alembic/versions/*.py 2>/dev/null)" ]; then
    echo "Running migrations..."
    alembic upgrade head
else
    echo "No migrations found."
fi

echo "Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
