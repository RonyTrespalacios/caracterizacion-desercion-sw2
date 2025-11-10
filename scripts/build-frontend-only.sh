#!/bin/bash

# Script para construir solo el frontend (útil si el backend ya está construido)
# Uso: ./scripts/build-frontend-only.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

mkdir -p logs
LOG_FILE="logs/build_frontend_$(date +%Y%m%d_%H%M%S).log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

if [ -t 0 ]; then
    exec > >(tee -a "$LOG_FILE")
    exec 2>&1
else
    exec >> "$LOG_FILE" 2>&1
fi

echo "📦 Construyendo solo el frontend..."
log "Iniciando build del frontend - Log guardado en: $LOG_FILE"
echo "💡 Esto puede tardar 30-60 minutos en un droplet de 2GB RAM"
echo ""

# Construir solo frontend (sin --no-cache para usar caché)
docker compose -f docker-compose.prod.yml build frontend 2>&1 | tee -a "$LOG_FILE" || {
    log "ERROR: Fallo en el build del frontend"
    echo "❌ Error durante el build del frontend"
    exit 1
}

echo ""
echo "✅ Frontend construido exitosamente"
echo "📋 Log guardado en: $LOG_FILE"
echo ""
echo "Para levantar los servicios:"
echo "  docker compose -f docker-compose.prod.yml up -d"

