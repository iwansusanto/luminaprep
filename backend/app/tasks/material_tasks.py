from celery import current_task
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.material import Material
from app.crud.material import update_material
import time
import logging

logger = logging.getLogger(__name__)


@celery_app.task(bind=True)
def process_material(self, material_id: str):
    """
    Process material asynchronously using AI/RAG agent.
    This task simulates the AI processing workflow.
    """
    db = SessionLocal()
    try:
        # Update task status
        self.update_state(state='PROGRESS', meta={'status': 'processing'})
        
        # Get material from database
        material = db.query(Material).filter(Material.id == material_id).first()
        if not material:
            raise ValueError(f"Material {material_id} not found")
        
        # Update material status to processing
        update_material(db, material_id, material.user_id, status="processing")
        
        # Simulate AI processing (replace with actual AI/RAG logic)
        logger.info(f"Processing material {material_id}: {material.file_name}")
        
        # Simulate processing time
        for i in range(10):
            time.sleep(1)
            # Update progress
            progress = (i + 1) * 10
            self.update_state(
                state='PROGRESS', 
                meta={'status': 'processing', 'progress': progress}
            )
        
        # Simulate AI-generated summary and citations
        summary = f"AI-generated summary for {material.file_name}. This material contains important educational content that has been processed and analyzed."
        citations = '{"source1": "Educational Database", "source2": "Academic Journal", "source3": "Research Paper"}'
        
        # Update material with processed data
        update_material(
            db, 
            material_id, 
            material.user_id, 
            status="processed",
            summary=summary,
            citations=citations
        )
        
        logger.info(f"Successfully processed material {material_id}")
        
        return {
            'status': 'completed',
            'material_id': material_id,
            'summary': summary,
            'citations': citations
        }
        
    except Exception as e:
        logger.error(f"Error processing material {material_id}: {str(e)}")
        
        # Update material status to failed
        try:
            update_material(db, material_id, material.user_id, status="failed")
        except:
            pass
        
        # Raise exception to mark task as failed
        raise self.retry(exc=e, countdown=60, max_retries=3)
        
    finally:
        db.close()
