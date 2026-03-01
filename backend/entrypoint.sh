#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

# Only load fixtures if the database is empty (first deploy or after DB reset)
# This avoids the heavy fixture loading (~1600 locations + demo data) on every cold start
CATEGORY_COUNT=$(python manage.py shell -c "from ads.models import ServiceCategory; print(ServiceCategory.objects.count())" 2>/dev/null || echo "0")
if [ "$CATEGORY_COUNT" = "0" ]; then
    echo "Database is empty, loading fixtures..."
    python manage.py load_fixtures
else
    echo "Fixtures already loaded ($CATEGORY_COUNT categories found), skipping."
fi

echo "Starting Gunicorn..."
exec gunicorn bigwatts.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
