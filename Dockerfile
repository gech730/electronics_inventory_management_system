# ==============================================================================
# Production Dockerfile for Laravel Backend on Render (PHP-FPM + Nginx)
# ==============================================================================
FROM php:8.3-fpm-bookworm

LABEL maintainer="Ngus Electronics Engineering Team"
LABEL description="Production container for Laravel backend on Render"

# Prevent interactive prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive
ENV COMPOSER_ALLOW_SUPERUSER=1
ENV PORT=10000

# 1. Install System Dependencies & Build Tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    gettext-base \
    curl \
    git \
    unzip \
    zip \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libpq-dev \
    libonig-dev \
    libxml2-dev \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Configure & Install PHP Extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        pdo_pgsql \
        bcmath \
        exif \
        gd \
        pcntl \
        zip \
        opcache

# 3. Install Composer from official image
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

# 4. Set Application Working Directory
WORKDIR /var/www/html

# 5. Leverage Docker Layer Caching for Composer Dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

# 6. Copy Application Source Code
COPY . .

# 7. Generate Optimized Class Autoloader & Discover Packages
RUN composer dump-autoload --optimize --no-dev

# 8. Configure Nginx, PHP, Supervisor, and Entrypoint
RUN mkdir -p /etc/nginx/templates /etc/nginx/conf.d /etc/supervisor/conf.d /var/log/supervisor /var/run /run/nginx

COPY docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/php/custom.ini /usr/local/etc/php/conf.d/custom.ini
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# 9. Set Permissions for Storage and Cache
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# 10. Expose Render Default Port
EXPOSE 10000 80

# 11. Run Container via Production Entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
