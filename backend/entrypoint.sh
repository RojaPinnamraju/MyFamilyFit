#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until python -c "
import psycopg2, os
from urllib.parse import urlparse
url = os.environ.get('DATABASE_URL', 'postgresql://familyfit:familyfit@db:5432/familyfit')
r = urlparse(url)
ssl = 'require' if r.hostname and 'neon.tech' in r.hostname else 'prefer'
try:
    conn = psycopg2.connect(
        dbname=r.path.lstrip('/').split('?')[0],
        user=r.username, password=r.password,
        host=r.hostname, port=r.port or 5432,
        sslmode=ssl,
    )
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
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
