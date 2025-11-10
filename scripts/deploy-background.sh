#!/bin/bash

# Script de despliegue en segundo plano
# Uso: ./scripts/deploy-background.sh
# Este script ejecuta el despliegue en background usando nohup
# Puedes cerrar la consola SSH y el proceso continuará

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Crear directorio de logs si no existe
mkdir -p logs
LOG_FILE="logs/deploy_$(date +%Y%m%d_%H%M%S).log"
PID_FILE="logs/deploy.pid"

echo "🚀 Iniciando despliegue en segundo plano..."
echo "📋 Log guardado en: $LOG_FILE"
echo "🆔 PID guardado en: $PID_FILE"
echo ""
echo "Puedes cerrar esta consola. El proceso continuará ejecutándose."
echo "Para ver el progreso: tail -f $LOG_FILE"
echo "Para verificar si está corriendo: ps -p \$(cat $PID_FILE)"
echo ""

# Ejecutar el script de despliegue en background con nohup
nohup bash "$SCRIPT_DIR/deploy.sh" > "$LOG_FILE" 2>&1 &
DEPLOY_PID=$!

# Guardar el PID
echo $DEPLOY_PID > "$PID_FILE"

echo "✅ Despliegue iniciado con PID: $DEPLOY_PID"
echo ""
echo "Comandos útiles:"
echo "  Ver progreso:     tail -f $LOG_FILE"
echo "  Ver últimas 50:   tail -n 50 $LOG_FILE"
echo "  Verificar estado: ps -p $DEPLOY_PID"
echo "  Detener (si es necesario): kill $DEPLOY_PID"
echo ""

