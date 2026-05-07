from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class ProjectBase(SQLModel):
    title: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)
    vector_collection_name: Optional[str] = Field(max_length=255, default=None)
    status: str = Field(default="active", max_length=50)  # active, archived, deleted


class Project(ProjectBase, table=True):
    __tablename__ = "projects"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="projects")
    materials: List["Material"] = Relationship(back_populates="project")
    quizzes: List["Quiz"] = Relationship(back_populates="project")
    agent_metrics: List["AgentMetrics"] = Relationship(back_populates="project")


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    vector_collection_name: Optional[str] = None
    status: Optional[str] = None
