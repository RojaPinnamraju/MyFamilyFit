#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import psycopg2, os
url = os.environ.get('DATABASE_URL', 'postgresql://familyfit:familyfit@db:5432/familyfit')
try:
    conn = psycopg2.connect(url)
    conn.close()
except Exception as e:
    print(f'Waiting... {e}')
    exit(1)
"; do
  sleep 2
done
echo "PostgreSQL is ready"

echo "Creating / verifying base schema..."
python -c "
from app.database import Base, engine
import app.models  # registers all models
Base.metadata.create_all(bind=engine)
print('Schema OK')
"

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FamilyFit API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
