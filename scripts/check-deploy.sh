#!/bin/bash

# Script para verificar el estado del despliegue en background
# Uso: ./scripts/check-deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

PID_FILE="logs/deploy.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "❌ No hay despliegue en progreso (no se encontró $PID_FILE)"
    exit 1
fi

DEPLOY_PID=$(cat "$PID_FILE")

if ps -p "$DEPLOY_PID" > /dev/null 2>&1; then
    echo "✅ Despliegue en progreso (PID: $DEPLOY_PID)"
    echo ""
    
    # Buscar el log más reciente
    LATEST_LOG=$(ls -t logs/deploy_*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "📋 Últimas 10 líneas del log:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -n 10 "$LATEST_LOG"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Ver log completo: tail -f $LATEST_LOG"
    fi
else
    echo "✅ Despliegue completado (proceso terminó)"
    echo ""
    
    # Buscar el log más reciente
    LATEST_LOG=$(ls -t logs/deploy_*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo "📋 Últimas 20 líneas del log:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -n 20 "$LATEST_LOG"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Ver log completo: cat $LATEST_LOG"
    fi
    
    # Limpiar PID file
    rm -f "$PID_FILE"
fi

