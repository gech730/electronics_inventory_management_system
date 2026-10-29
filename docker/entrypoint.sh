#!/usr/bin/env bash
set -e

# 1. Resolve Render assigned PORT (Default: 10000)
export PORT="${PORT:-10000}"
echo "==> Configuring Nginx to listen on Port: ${PORT}"

# Replace ${PORT} placeholder in Nginx config template
if [ -f /etc/nginx/templates/default.conf.template ]; then
    envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
fi

# Remove default Debian Nginx site if present to prevent port collision
rm -f /etc/nginx/sites-enabled/default

# 2. Ensure storage and cache directory permissions
echo "==> Setting directory permissions for storage and bootstrap/cache..."
mkdir -p /var/www/html/storage/framework/{sessions,views,cache} /var/www/html/storage/logs /var/www/html/bootstrap/cache
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# 3. Prepare SQLite if selected as database
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    SQLITE_PATH="${DB_DATABASE:-/var/www/html/database/database.sqlite}"
    if [ ! -f "$SQLITE_PATH" ]; then
        echo "==> Initializing SQLite database file at ${SQLITE_PATH}..."
        mkdir -p "$(dirname "$SQLITE_PATH")"
        touch "$SQLITE_PATH"
        chown www-data:www-data "$SQLITE_PATH"
        chmod 664 "$SQLITE_PATH"
    fi
fi

# 4. Optional Safe Database Migrations (Triggered if RUN_MIGRATIONS=true)
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "==> Checking and running database migrations..."
    php artisan migrate --force --no-interaction || echo "==> Migrations failed or database not ready yet; continuing..."
fi

# 5. Production Optimization & Cache Rebuild
echo "==> Optimizing Laravel routes and configuration..."
php artisan config:clear
php artisan route:clear
php artisan view:clear

if [ "${APP_ENV:-production}" = "production" ]; then
    php artisan config:cache || echo "==> config:cache skipped"
    php artisan route:cache || echo "==> route:cache skipped"
    php artisan view:cache || echo "==> view:cache skipped"
fi

# 6. Start Supervisord (manages PHP-FPM and Nginx)
echo "==> Starting PHP-FPM and Nginx via Supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
