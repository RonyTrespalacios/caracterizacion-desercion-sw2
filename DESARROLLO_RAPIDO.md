# Desarrollo Rápido - Frontend sin Docker

## Problema
Cada cambio en el frontend con Docker requiere rebuild completo (3-5 minutos), muy lento para desarrollo.

## Solución 1: Desarrollo local (RECOMENDADO)

### Setup una sola vez
```bash
cd frontend
npm install
```

### Cada vez que desarrolles
```bash
# En una terminal
cd frontend
npm start

# Frontend con hot-reload: http://localhost:4200
# Cambios se reflejan instantáneamente
```

El backend sigue corriendo en Docker (puerto 8000), solo el frontend corre localmente.

## Solución 2: Docker sin --no-cache

```bash
# Solo rebuild normal (más rápido, usa caché de capas)
docker compose -f docker-compose.dev.yml build frontend
docker compose -f docker-compose.dev.yml up -d frontend

# Solo usar --no-cache cuando:
# - Cambies package.json (nuevas dependencias)
# - Haya problemas de caché
```

## Solución 3: Docker con volúmenes (avanzado)

Montar el código fuente como volumen para evitar rebuilds, pero requiere configuración adicional y puede tener problemas de permisos en Windows.

## Recomendación

Para desarrollo día a día:
1. **Backend + DB en Docker** (estables, no cambian mucho)
2. **Frontend local con `npm start`** (hot-reload instantáneo)

Solo rebuild de Docker cuando vayas a hacer deploy o testing final.

# 1. Parar y eliminar solo el contenedor del frontend
docker compose -f docker-compose.dev.yml stop frontend
docker compose -f docker-compose.dev.yml rm -f frontend

# 2. Verificar que backend y DB sigan corriendo
docker compose -f docker-compose.dev.yml ps

# 3. Levantar frontend localmente
cd frontend
npm install
npm start

