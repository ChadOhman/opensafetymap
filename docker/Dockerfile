FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql \
  && a2enmod rewrite

# Configure PHP for large uploads
RUN echo "upload_max_filesize = 110M" > /usr/local/etc/php/conf.d/uploads.ini \
  && echo "post_max_size = 120M" >> /usr/local/etc/php/conf.d/uploads.ini \
  && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

WORKDIR /var/www/html
COPY . /var/www/html

# Set DocumentRoot to public/
RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf

RUN chown -R www-data:www-data /var/www/html \
  && mkdir -p /var/www/html/uploads/pending \
  && chown www-data:www-data /var/www/html/uploads/pending

EXPOSE 80
CMD ["apache2-foreground"]
