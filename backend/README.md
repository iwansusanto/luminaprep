# LuminaPrep Backend

FastAPI backend service for the LuminaPrep AI-powered learning platform.

## Features

- User authentication with JWT tokens
- Project and material management
- Quiz generation from uploaded materials
- Real-time streaming with Server-Sent Events
- Async task processing with Celery

## Setup

```bash
uv sync
```

## Environment Variables

Create a `.env` file:

```env
DATABASE_URL=mysql+mysqlconnector://user:password@localhost:3306/luminaprep
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Running

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.
