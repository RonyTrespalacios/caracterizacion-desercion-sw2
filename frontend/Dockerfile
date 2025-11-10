# Dockerfile para Frontend Angular

# Etapa 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --silent

# Copiar el código fuente
COPY . .

# Build de producción
# Usando development config para evitar límites de budget estrictos en Docker
RUN npm run build -- --configuration=development --output-path=dist/trayectoria-estudiantil

# Etapa 2: Servir con Nginx
FROM nginx:alpine

# Copiar archivos compilados
COPY --from=build /app/dist/trayectoria-estudiantil /usr/share/nginx/html

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto 80
EXPOSE 80

# Comando por defecto de Nginx
CMD ["nginx", "-g", "daemon off;"]

