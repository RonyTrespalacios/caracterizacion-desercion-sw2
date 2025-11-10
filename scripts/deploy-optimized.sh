#!/bin/bash

# Script de despliegue optimizado - construye en etapas
# Uso: ./scripts/deploy-optimized.sh
# Construye backend primero (rápido), luego frontend (lento)
# Permite usar caché de Docker para acelerar

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Crear directorio de logs si no existe
mkdir -p logs
LOG_FILE="logs/deploy_optimized_$(date +%Y%m%d_%H%M%S).log"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Redirigir stdout y stderr al log
if [ -t 0 ]; then
    exec > >(tee -a "$LOG_FILE")
    exec 2>&1
else
    exec >> "$LOG_FILE" 2>&1
fi

echo "🚀 Iniciando despliegue optimizado..."
log "Iniciando despliegue optimizado - Log guardado en: $LOG_FILE"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: No se encontró docker-compose.prod.yml${NC}"
    log "ERROR: No se encontró docker-compose.prod.yml"
    exit 1
fi

# Verificar que existe el archivo .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No se encontró backend/.env${NC}"
    log "WARNING: No se encontró backend/.env"
    exit 1
fi

# ESTRATEGIA: Construir en etapas
# 1. Backend primero (rápido, ~2-5 min)
# 2. Frontend después (lento, ~30-60 min)
# 3. Usar caché cuando sea posible

echo -e "${GREEN}📦 Etapa 1: Construyendo backend (rápido)...${NC}"
log "Construyendo backend..."
docker compose -f docker-compose.prod.yml build backend 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en el build del backend"
    echo -e "${RED}❌ Error durante el build del backend${NC}"
    exit 1
}

echo -e "${GREEN}✅ Backend construido exitosamente${NC}"
log "Backend construido exitosamente"

echo -e "${GREEN}📦 Etapa 2: Construyendo frontend (esto puede tardar 30-60 minutos)...${NC}"
echo -e "${YELLOW}💡 Tip: Puedes cerrar esta consola y usar 'tail -f $LOG_FILE' para monitorear${NC}"
log "Construyendo frontend (puede tardar mucho tiempo)..."

# Construir frontend (sin --no-cache para usar caché si existe)
docker compose -f docker-compose.prod.yml build frontend 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en el build del frontend"
    echo -e "${RED}❌ Error durante el build del frontend${NC}"
    exit 1
}

echo -e "${GREEN}✅ Frontend construido exitosamente${NC}"
log "Frontend construido exitosamente"

# Construir servicios de infraestructura (rápido)
echo -e "${GREEN}📦 Etapa 3: Verificando servicios de infraestructura...${NC}"
log "Verificando servicios de infraestructura..."
docker compose -f docker-compose.prod.yml build db redis 2>&1 | tee -a "$LOG_FILE" || {
    log "WARNING: Problemas construyendo db/redis (puede ser normal si usan imágenes pre-construidas)"
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
    echo -e "${RED}❌ Error durante migraciones${NC}"
    exit 1
}

# Recopilar archivos estáticos
echo -e "${GREEN}📁 Recopilando archivos estáticos...${NC}"
log "Recopilando archivos estáticos..."
docker compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en collectstatic"
    echo -e "${RED}❌ Error durante collectstatic${NC}"
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

