# Guía de Docker (Desarrollo)

Esta guía usa el comando moderno `docker compose` (sin guion). Evita `docker-compose` que está en desuso.

## Requisitos
- Docker Desktop actualizado (incluye Docker Compose v2)
- Puertos libres: 5432 (DB), 8000 (backend), 4200 (frontend)

## Servicios (archivo dev)
- Archivo: `docker-compose.dev.yml`
- Servicios: `db`, `backend`, `frontend`

---

## 1) Primer levantamiento (build + up)
```bash
# Construir imágenes y levantar contenedores en segundo plano
docker compose -f docker-compose.dev.yml up -d --build

# Ver estado
docker compose -f docker-compose.dev.yml ps

# Ver logs (seguimiento)
docker compose -f docker-compose.dev.yml logs -f
```

### Comprobaciones rápidas
- Backend: http://localhost:8000
- Frontend: http://localhost:4200
- Admin Django: http://localhost:8000/admin

---

## 2) Reiniciar servicios sin reconstruir imágenes
```bash
# Reiniciar un servicio
docker compose -f docker-compose.dev.yml restart backend

# Reiniciar todos
docker compose -f docker-compose.dev.yml restart
```

---

## 3) Actualizar cambios de código
Dependiendo del servicio:

- Frontend (Angular + Nginx): requiere reconstruir imagen para aplicar cambios TS/SCSS
```bash
docker compose -f docker-compose.dev.yml build frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

- Backend (Django): en dev con autoreload suele bastar reiniciar el contenedor
```bash
docker compose -f docker-compose.dev.yml restart backend
```

- Forzar rebuild sin caché (útil si no ves cambios):
```bash
docker compose -f docker-compose.dev.yml build --no-cache frontend
# o todos los servicios
# docker compose -f docker-compose.dev.yml build --no-cache

docker compose -f docker-compose.dev.yml up -d frontend
```

---

## 4) Tumbar, limpiar y volver a levantar

### 4.1 Parar y eliminar contenedores (manteniendo volúmenes e imágenes)
```bash
docker compose -f docker-compose.dev.yml down
```

### 4.2 Eliminar contenedores + volúmenes del proyecto (borra datos de DB)
```bash
docker compose -f docker-compose.dev.yml down -v
```

### 4.3 Limpiar cachés e imágenes colgantes
```bash
# Imágenes sin usar (dangling)
docker image prune -f

# Todo lo no usado por al menos un contenedor (cuidado)
docker system prune -f

# Incluir volúmenes no referenciados (mucho cuidado, borra datos)
docker system prune -a --volumes -f
```

### 4.4 Reconstruir todo desde cero
```bash
docker compose -f docker-compose.dev.yml build --no-cache
docker compose -f docker-compose.dev.yml up -d
```

---

## 5) Comandos útiles
```bash
# Estado de servicios
docker compose -f docker-compose.dev.yml ps

# Logs por servicio
docker compose -f docker-compose.dev.yml logs -f backend

# Entrar al contenedor backend (shell)
docker compose -f docker-compose.dev.yml exec backend bash

# Ejecutar migraciones de Django
docker compose -f docker-compose.dev.yml exec backend python manage.py makemigrations
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Crear superusuario (si fuera necesario)
docker compose -f docker-compose.dev.yml exec backend python manage.py createsuperuser

# Verificar conteo en DB (ejemplo)
docker compose -f docker-compose.dev.yml exec backend \
  python manage.py shell -c "from apps.data_manager.models import DatosEstudiante as D; print(D.objects.count())"
```

---

## 6) Problemas comunes
- No ves cambios del frontend: reconstruye imagen del `frontend` (TS/SCSS no se sirven en caliente en Nginx).
- Errores de puertos: verifica que 4200/8000/5432 no estén ocupados.
- DB vacía tras `down -v`: se borraron volúmenes; vuelve a cargar datos.

---

## 7) Flujo recomendado para “limpiar y volver a levantar”
```bash
# 1. Tumbar todo y borrar volúmenes del proyecto (incluye datos DB)
docker compose -f docker-compose.dev.yml down -v

# 2. Limpiar cachés (opcional)
docker system prune -f

# 3. Reconstruir imágenes sin caché
docker compose -f docker-compose.dev.yml build --no-cache

# 4. Levantar todo
docker compose -f docker-compose.dev.yml up -d

# 5. Verificar estado
docker compose -f docker-compose.dev.yml ps
```

---

## 8) Solo reconstruir y levantar frontend (rápido)
```bash
docker compose -f docker-compose.dev.yml up -d --build frontend
# Si persiste, forzar sin caché
docker compose -f docker-compose.dev.yml build --no-cache frontend
docker compose -f docker-compose.dev.yml up -d frontend
```

```bash
# Levantar solo backend (db + backend); el frontend se ejecuta local con npm start
docker compose -f docker-compose.dev.yml up -d db backend
```

---

## 9) Entornos
- Desarrollo: `docker-compose.dev.yml`
- Producción: usar `docker-compose.yml` (incluye Redis/Celery; ajustar variables)

---

## 10) URLs
- Backend: http://localhost:8000
- Admin:   http://localhost:8000/admin
- Frontend: http://localhost:4200
