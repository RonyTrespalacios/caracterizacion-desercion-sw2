#!/bin/bash

# Script de despliegue rápido para producción
# Uso: ./scripts/deploy.sh

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue en producción..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: No se encontró docker-compose.prod.yml${NC}"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró backend/.env${NC}"
    echo "Por favor, crea el archivo .env basándote en backend/env.example"
    exit 1
fi

# Construir imágenes
echo -e "${GREEN}📦 Construyendo imágenes Docker...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

# Detener contenedores existentes
echo -e "${GREEN}🛑 Deteniendo contenedores existentes...${NC}"
docker compose -f docker-compose.prod.yml down

# Levantar servicios
echo -e "${GREEN}⬆️  Levantando servicios...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
echo -e "${GREEN}⏳ Esperando a que los servicios estén listos...${NC}"
sleep 10

# Ejecutar migraciones
echo -e "${GREEN}🗄️  Ejecutando migraciones...${NC}"
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput

# Recopilar archivos estáticos
echo -e "${GREEN}📁 Recopilando archivos estáticos...${NC}"
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# Verificar estado
echo -e "${GREEN}✅ Verificando estado de los servicios...${NC}"
docker compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✨ Despliegue completado!${NC}"
echo ""
echo "Servicios disponibles:"
echo "  - Frontend: http://tu-dominio.com"
echo "  - Backend API: http://tu-dominio.com/api/v1/"
echo "  - Admin Django: http://tu-dominio.com/admin/"
echo ""
echo "Para ver los logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Para crear un superusuario:"
echo "  docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"

