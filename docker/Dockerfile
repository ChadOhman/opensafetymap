# PHP + Apache setup
FROM php:8.2-apache

# Install extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Copy project files into container
WORKDIR /var/www/html
COPY ./public /var/www/html/public
COPY ./api /var/www/html/api
COPY ./db /var/www/html/db

# Set permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
CMD ["apache2-foreground"]
