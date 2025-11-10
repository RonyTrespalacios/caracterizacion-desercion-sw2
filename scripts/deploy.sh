#!/bin/bash

# Script de despliegue rápido para producción
# Uso: ./scripts/deploy.sh

set -e  # Salir si hay algún error

# Crear directorio de logs si no existe
mkdir -p logs
LOG_FILE="logs/deploy_$(date +%Y%m%d_%H%M%S).log"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Redirigir stdout y stderr al log y a la consola
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "🚀 Iniciando despliegue en producción..."
log "Iniciando despliegue - Log guardado en: $LOG_FILE"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: No se encontró docker-compose.prod.yml${NC}"
    log "ERROR: No se encontró docker-compose.prod.yml"
    echo "Asegúrate de ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró backend/.env${NC}"
    log "WARNING: No se encontró backend/.env"
    echo "Por favor, crea el archivo .env basándote en backend/env.example"
    exit 1
fi

# Verificar recursos del sistema antes de construir
log "Verificando recursos del sistema..."
if command -v free &> /dev/null; then
    TOTAL_MEM=$(free -m | awk 'NR==2{print $2}')
    USED_MEM=$(free -m | awk 'NR==2{print $3}')
    FREE_MEM_PERCENT=$(( (TOTAL_MEM - USED_MEM) * 100 / TOTAL_MEM ))
    log "Memoria total: ${TOTAL_MEM}MB, Libre: ${FREE_MEM_PERCENT}%"
    if [ "$FREE_MEM_PERCENT" -lt 20 ]; then
        echo -e "${YELLOW}⚠️  Advertencia: Menos del 20% de memoria libre (${FREE_MEM_PERCENT}%). El build puede fallar.${NC}"
        log "WARNING: Memoria libre baja: ${FREE_MEM_PERCENT}%"
    fi
else
    log "Comando 'free' no disponible, saltando verificación de memoria"
fi

# Construir imágenes con logging detallado
echo -e "${GREEN}📦 Construyendo imágenes Docker...${NC}"
log "Iniciando build de imágenes Docker..."
docker compose -f docker-compose.prod.yml build --no-cache 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en el build de Docker"
    echo -e "${RED}❌ Error durante el build. Revisa el log: $LOG_FILE${NC}"
    exit 1
}

# Detener contenedores existentes
echo -e "${GREEN}🛑 Deteniendo contenedores existentes...${NC}"
log "Deteniendo contenedores existentes..."
docker compose -f docker-compose.prod.yml down 2>&1 | tee -a "$LOG_FILE"

# Levantar servicios
echo -e "${GREEN}⬆️  Levantando servicios...${NC}"
log "Levantando servicios..."
docker compose -f docker-compose.prod.yml up -d 2>&1 | tee -a "$LOG_FILE"

# Esperar a que los servicios estén listos
echo -e "${GREEN}⏳ Esperando a que los servicios estén listos...${NC}"
log "Esperando a que los servicios estén listos..."
sleep 10

# Ejecutar migraciones
echo -e "${GREEN}🗄️  Ejecutando migraciones...${NC}"
log "Ejecutando migraciones..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en migraciones"
    echo -e "${RED}❌ Error durante migraciones. Revisa el log: $LOG_FILE${NC}"
    exit 1
}

# Recopilar archivos estáticos
echo -e "${GREEN}📁 Recopilando archivos estáticos...${NC}"
log "Recopilando archivos estáticos..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en collectstatic"
    echo -e "${RED}❌ Error durante collectstatic. Revisa el log: $LOG_FILE${NC}"
    exit 1
}

# Verificar estado
echo -e "${GREEN}✅ Verificando estado de los servicios...${NC}"
log "Verificando estado de los servicios..."
docker compose -f docker-compose.prod.yml ps 2>&1 | tee -a "$LOG_FILE"

log "Despliegue completado exitosamente"
echo -e "${GREEN}✨ Despliegue completado!${NC}"
echo ""
echo "📋 Log completo guardado en: $LOG_FILE"
echo ""
echo "Servicios disponibles:"
echo "  - Frontend: http://tu-dominio.com"
echo "  - Backend API: http://tu-dominio.com/api/v1/"
echo "  - Admin Django: http://tu-dominio.com/admin/"
echo ""
echo "Para ver los logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Para ver el log del despliegue:"
echo "  cat $LOG_FILE"
echo ""
echo "Para crear un superusuario:"
echo "  docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"

