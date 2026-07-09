#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import psycopg2, os
url = os.environ.get('DATABASE_URL', 'postgresql://familyfit:familyfit@db:5432/familyfit')
parts = url.replace('postgresql://', '').split('/')
db = parts[1]
userhost = parts[0].split('@')
user_pass = userhost[0].split(':')
host_port = userhost[1].split(':')
try:
    conn = psycopg2.connect(dbname=db, user=user_pass[0], password=user_pass[1],
                             host=host_port[0], port=host_port[1])
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

# Run migrations (idempotent — migration 002 checks column existence before adding)
echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting FamilyFit API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
