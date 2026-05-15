from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "luminaprep_backend",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.tasks.quiz_tasks"],
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)
