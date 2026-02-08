#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Loading fixtures..."
python manage.py load_fixtures

echo "Starting Gunicorn..."
exec gunicorn bigwatts.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
