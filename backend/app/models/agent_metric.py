from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import JSON
from typing import Optional, Dict, Any
from datetime import datetime
import uuid


class AgentMetricBase(SQLModel):
    trace_id: Optional[str] = Field(default=None, max_length=255)
    event_type: str = Field(max_length=255)
    latency_ms: Optional[float] = None
    cost_usd: Optional[float] = None
    accuracy_score: Optional[float] = None
    hallucination_detected: Optional[bool] = None


class AgentMetric(AgentMetricBase, table=True):
    __tablename__ = "agent_metrics"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    project_id: str = Field(foreign_key="projects.id")
    token_usage: Optional[Dict[str, Any]] = Field(sa_type=JSON, default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"comment": "Soft delete timestamp"})
    
    # Relationships
    project: "Project" = Relationship(back_populates="agent_metrics")


class AgentMetricCreate(AgentMetricBase):
    project_id: str


class AgentMetricRead(AgentMetricBase):
    id: str
    project_id: str
    created_at: datetime


class AgentMetricUpdate(SQLModel):
    trace_id: Optional[str] = Field(default=None, max_length=255)
    event_type: Optional[str] = Field(default=None, max_length=255)
    latency_ms: Optional[float] = None
    token_usage: Optional[Dict[str, Any]] = None
    cost_usd: Optional[float] = None
    accuracy_score: Optional[float] = None
    hallucination_detected: Optional[bool] = None
