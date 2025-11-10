# Dockerfile para Frontend Angular

# Etapa 1: Build
FROM node:18-alpine AS build

# Reducir el límite de memoria para droplets con recursos limitados (2GB RAM)
# Usar 1.5GB máximo para dejar espacio para el sistema y Docker
ENV NODE_OPTIONS="--max-old-space-size=1536"

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias (sin --silent para ver progreso)
RUN npm install

# Copiar el código fuente
COPY . .

# Build usando configuración "light" (menos optimizaciones = menos memoria)
# Esta configuración desactiva buildOptimizer que es muy pesado en memoria
RUN npm run build -- --configuration=light --output-path=dist/trayectoria-estudiantil 2>&1 | tee /tmp/build.log || (cat /tmp/build.log && exit 1)

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiar archivos compilados
COPY --from=build /app/dist/trayectoria-estudiantil /usr/share/nginx/html

# Copiar configuración de Nginx para producción
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto de Nginx
CMD ["nginx", "-g", "daemon off;"]

