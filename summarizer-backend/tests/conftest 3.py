"""Test configuration and fixtures for LOA-ESS backend."""

import asyncio
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.database import Base
from app.models import Module, LearningOutcome, Week


# Use SQLite for tests (fast, no external deps)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provide a clean database session for each test."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
def sample_module_data() -> dict:
    """Sample module data for testing."""
    return {
        "code": "IT2060",
        "name": "Database Systems",
        "description": "Introduction to database systems and SQL",
        "credits": 4,
        "lecturer": "Dr. Smith",
        "year": 2026,
        "semester": 1,
        "department": "IT",
        "assessment_structure": {"exam": 60, "coursework": 40},
    }


@pytest.fixture
def sample_learning_outcomes() -> list[dict]:
    """Sample learning outcomes for testing."""
    return [
        {
            "lo_code": "LO1",
            "text": "Define and explain fundamental database concepts including entities, attributes, and relationships",
            "bloom_level": "Understand",
            "bloom_verb": "explain",
            "topic_keywords": ["database", "entity", "attribute", "relationship"],
        },
        {
            "lo_code": "LO2",
            "text": "Apply normalization techniques to reduce data redundancy up to Third Normal Form",
            "bloom_level": "Apply",
            "bloom_verb": "apply",
            "topic_keywords": ["normalization", "1NF", "2NF", "3NF", "redundancy"],
        },
        {
            "lo_code": "LO3",
            "text": "Evaluate trade-offs between relational and NoSQL databases for given use cases",
            "bloom_level": "Evaluate",
            "bloom_verb": "evaluate",
            "topic_keywords": ["relational", "NoSQL", "trade-off", "scalability"],
        },
    ]


@pytest.fixture
def sample_summary() -> str:
    """Sample generated summary for evaluation testing."""
    return """## Week 5: Database Normalization

### LO2 [Apply]: Apply normalization techniques to reduce data redundancy up to 3NF

Database normalization is a systematic process of organizing a relational database
to reduce data redundancy and improve data integrity [Source: Week05_Normalization.pptx, Slide 3].

**First Normal Form (1NF)** requires that each column contains atomic values
and each row is unique [Source: Week05_Normalization.pptx, Slide 8].

**Second Normal Form (2NF)** requires that the table is in 1NF and every
non-key attribute is fully functionally dependent on the primary key
[Source: Week05_Normalization.pptx, Slide 12].

**Third Normal Form (3NF)** requires that the table is in 2NF and no
transitive dependencies exist [Source: Week05_Notes.pdf, Page 15].

### Example
Consider a Student-Course table: applying normalization step by step...

### Key Takeaways
- Normalization reduces redundancy but may impact query performance
- 3NF is sufficient for most practical applications
- Denormalization is sometimes used for performance optimization
"""
