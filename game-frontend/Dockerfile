# Dockerfile para servir el frontend ya compilado con Nginx.
# El build se hace en local con el script build-prod.sh
# y se sube el resultado a Dokploy.
FROM nginx:alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
