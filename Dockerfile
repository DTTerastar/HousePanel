FROM php:7.2-apache
COPY /src/ /var/www/html/
RUN echo 'disable_functions = "show_source, system, shell_exec, passthru, exec, phpinfo, popen, proc_open, allow_url_fopen"\n' > /usr/local/etc/php/conf.d/harden.ini
RUN chmod 755 /var/www/html/