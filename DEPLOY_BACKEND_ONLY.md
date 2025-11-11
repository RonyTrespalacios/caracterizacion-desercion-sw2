# Guía de Despliegue: Backend Solo en Digital Ocean

Esta guía explica cómo desplegar **solo el backend** en un droplet de Digital Ocean, mientras el frontend se despliega en Netlify.

## 1. Preparar el Droplet (Ubuntu 22.04)

```bash
# Conectarse al droplet
ssh root@TU_IP_DROPLET

# Actualizar sistema
apt-get update && apt-get upgrade -y

# Instalar Docker y Docker Compose
apt-get install -y ca-certificates curl gnupg git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Configurar firewall
ufw allow OpenSSH
ufw allow 8000/tcp
ufw enable
```

## 2. Clonar el Repositorio

```bash
cd /root
git clone https://github.com/TU_ORG/caracterizacion-desercion-sw2.git
cd caracterizacion-desercion-sw2
```

## 3. Configurar Variables de Entorno

**⚠️ CRÍTICO: En Docker, `DB_HOST` debe ser `db` (nombre del servicio), NO `localhost`**

```bash
cd backend
cp env.example .env
nano .env
```

Configura el archivo `.env` con estos valores:

```env
# Seguridad
SECRET_KEY=TU_SECRET_KEY_AQUI
DEBUG=False

# Hosts permitidos (agrega tu IP del droplet)
ALLOWED_HOSTS=143.198.145.215

# Base de datos - IMPORTANTE: DB_HOST debe ser "db" (nombre del servicio Docker)
DB_ENGINE=django.db.backends.postgresql
DB_NAME=trayectoria_estudiantil
DB_USER=trayectoria_user
DB_PASSWORD=TU_PASSWORD_SEGURA_AQUI
DB_HOST=db
DB_PORT=5432

# CORS - Agrega tu dominio de Netlify
CORS_ALLOWED_ORIGINS=https://TU_SITIO_NETLIFY.netlify.app

# Redis (opcional, si usas Celery)
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

**Puntos clave:**
- `DB_HOST=db` (NO `localhost`, NO `127.0.0.1`)
- `DB_USER` y `DB_PASSWORD` deben coincidir con los valores en `docker-compose.backend.yml`
- `ALLOWED_HOSTS` debe incluir la IP del droplet
- `CORS_ALLOWED_ORIGINS` debe incluir tu dominio de Netlify

## 4. Desplegar Backend

```bash
cd /root/caracterizacion-desercion-sw2

# Construir y levantar servicios
docker compose -f docker-compose.backend.yml up -d --build

# Ver logs para verificar que todo funciona
docker compose -f docker-compose.backend.yml logs -f backend
```

Espera a ver mensajes como:
- `Starting gunicorn` (sin errores)
- `Booting worker`

Si ves errores de conexión a la base de datos, verifica que `DB_HOST=db` en el `.env`.

## 5. Crear Superusuario

Una vez que el backend esté corriendo sin errores:

```bash
docker compose -f docker-compose.backend.yml exec backend python manage.py createsuperuser
```

Ingresa:
- Username: (el que quieras)
- Email: (opcional)
- Password: (el que quieras)

## 6. Acceder al Admin

Abre en tu navegador:
```
http://143.198.145.215:8000/admin/
```

## 7. Verificar API

```bash
# Desde tu máquina local
curl http://143.198.145.215:8000/api/v1/
```

## Solución de Problemas

### Error: "connection to server at localhost failed"
**Causa:** `DB_HOST` en `.env` está configurado como `localhost` en lugar de `db`.

**Solución:**
```bash
cd /root/caracterizacion-desercion-sw2/backend
nano .env
# Cambiar DB_HOST=localhost a DB_HOST=db
docker compose -f docker-compose.backend.yml restart backend
```

### Error: "Container is restarting"
**Causa:** El backend está fallando al iniciar (ver logs arriba).

**Solución:**
```bash
docker compose -f docker-compose.backend.yml logs backend --tail=100
# Revisa el error específico y corrígelo
```

### Error: "sh: 4: --workers: not found"
**Causa:** El comando de gunicorn está mal formateado en `docker-compose.backend.yml`.

**Solución:** Usa el archivo `docker-compose.backend.yml` del repositorio que tiene el comando correcto.

## Comandos Útiles

```bash
# Ver estado de contenedores
docker compose -f docker-compose.backend.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.backend.yml logs -f

# Reiniciar backend
docker compose -f docker-compose.backend.yml restart backend

# Detener todo
docker compose -f docker-compose.backend.yml down

# Detener y eliminar volúmenes (CUIDADO: borra la base de datos)
docker compose -f docker-compose.backend.yml down -v
```

