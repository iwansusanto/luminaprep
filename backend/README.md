# LuminaPrep Backend

FastAPI backend service for the LuminaPrep AI-powered learning platform.

## Features

- 🔐 User authentication with JWT tokens
- 📁 Project and material management
- 🤖 AI-powered quiz generation from uploaded materials
- 🌊 Real-time streaming with Server-Sent Events
- ⚡ Async task processing with Celery
- 📊 Complete analytics and session tracking
- 🎯 Multi-day progress tracking (Hari 1-8)

## Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- MySQL and Redis (handled by Docker Compose)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd luminaprep/backend
```

### 2. Environment Configuration
```bash
cp env.example .env
# Edit .env with your actual values
```

### 3. Run with Docker Compose
```bash
docker-compose up -d
```

### 4. Access Services
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Flower (Celery Monitor)**: http://localhost:5555
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

## Manual Setup (Development)

### Prerequisites
- Python 3.11+
- MySQL 8.0+
- Redis 6.0+

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file:

```env
DATABASE_URL=mysql+mysqlconnector://user:password@localhost:3306/luminaprep
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
OPENAI_API_KEY=your-openai-api-key-here
```

### 3. Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE luminaprep;"

# Run migrations
alembic upgrade head
```

### 4. Start Services
```bash
# Start Redis (in separate terminal)
redis-server

# Start Celery Worker (in separate terminal)
celery -A app.celery_app worker --loglevel=info

# Start API Server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/v1/          # API endpoints
│   ├── agents/          # AI processing agents
│   ├── crud/            # Database operations
│   ├── models/          # Database models
│   ├── schemas/         # Pydantic schemas
│   └── main.py          # FastAPI app
├── alembic/             # Database migrations
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Multi-service setup
└── env.example         # Environment template
```

## Available Endpoints

### Authentication
- `POST /api/v1/auth/signin` - User login

### Projects
- `GET /api/v1/projects/` - List projects
- `POST /api/v1/projects/` - Create project

### Materials
- `GET /api/v1/materials/{id}` - Get material
- `POST /api/v1/materials` - Create material
- `GET /api/v1/materials/project/{project_id}` - Get materials by project

### Quizzes
- `POST /api/v1/materials/{material_id}/quizzes` - Generate quiz
- `GET /api/v1/quizzes/{id}` - Get quiz details
- `POST /api/v1/quizzes/{id}/sessions` - Start quiz session

### Quiz Sessions
- `GET /api/v1/quiz_sessions/{id}/questions` - Get session questions
- `POST /api/v1/quiz_sessions/{id}/submit_answer` - Submit answer
- `POST /api/v1/quiz_sessions/{id}/complete` - Complete session
- `GET /api/v1/quiz_sessions/sessions` - Get user sessions

### Streaming (Hari 7)
- `GET /api/v1/stream/summary/{material_id}` - Material summary stream
- `GET /api/v1/stream/feedback/{session_id}/{question_id}` - Feedback stream

### Analytics (Hari 8)
- `GET /api/v1/quiz_sessions/sessions/{id}` - Session details with analytics

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
isort .
```

### Type Checking
```bash
mypy app/
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Production Deployment

### Environment Variables Required
- `DATABASE_URL` - MySQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `SECRET_KEY` - JWT secret key
- `REDIS_URL` - Redis connection string

### Docker Production
```bash
# Build and run
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Monitoring

- **Flower**: Celery task monitoring at http://localhost:5555
- **Logs**: Structured logging with rich formatting
- **Health Check**: `GET /health` endpoint

## Troubleshooting

### Common Issues
1. **Database Connection**: Ensure MySQL is running and credentials are correct
2. **Redis Connection**: Check Redis service status
3. **OpenAI API**: Verify API key is valid and has credits
4. **Port Conflicts**: Change ports in docker-compose.yml if needed

### Debug Mode
Set `DEBUG=True` in environment for detailed error messages.

## License

MIT License - see LICENSE file for details.
