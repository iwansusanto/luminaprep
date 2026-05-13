from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
import uuid


class ProjectBase(SQLModel):
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)


class Project(ProjectBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: Optional["User"] = Relationship(back_populates="projects")
    materials: List["Material"] = Relationship(back_populates="project")
    quizzes: List["Quiz"] = Relationship(back_populates="project")
    agent_metrics: List["AgentMetric"] = Relationship(back_populates="project")


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(SQLModel):
    name: Optional[str] = None
    description: Optional[str] = None
