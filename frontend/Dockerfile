# Dockerfile para Frontend Angular

# Etapa 1: Build
FROM node:18-alpine AS build

# Aumentar el límite de memoria de Node.js para evitar errores de heap
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --silent

# Copiar el código fuente
COPY . .

# Build de producción
# Usando configuración de producción (más optimizada y requiere menos memoria)
RUN npm run build -- --configuration=production --output-path=dist/trayectoria-estudiantil

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

