#!/bin/sh
set -e

echo "==> Waiting for database..."
python manage.py wait_for_db --timeout 120

echo "==> Migrations..."
python manage.py migrate --noinput

echo "==> Collectstatic..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "==> Ensure superuser..."
python manage.py ensure_superuser

echo "==> Starting: $*"
exec "$@"
