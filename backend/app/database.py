from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

# For Neon (and other cloud Postgres), the URL already contains sslmode=require
# as a query param. SQLAlchemy passes it through to psycopg2 automatically.
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # detect stale connections (important for cloud DBs)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
