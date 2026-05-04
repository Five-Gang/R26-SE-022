"""Database session and declarative base.

Pattern: one engine per process, one session per request. FastAPI dependency
`get_db` yields a session and ensures it's closed even if the request errors.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# echo=True logs every SQL statement — flip to False once you trust your queries
engine = create_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,  # detects dead connections (e.g. after db restart)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """All ORM models inherit from this."""

    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yields a DB session, guarantees cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
