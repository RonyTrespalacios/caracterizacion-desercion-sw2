# Guía de Despliegue en Producción - Digital Ocean Droplet (Ubuntu)

Esta guía te ayudará a desplegar la aplicación **Trayectoria Estudiantil** en un servidor Ubuntu de Digital Ocean.

## 📋 Requisitos Previos

- Droplet de Digital Ocean con Ubuntu 22.04 LTS o superior
- Acceso SSH al servidor
- Dominio configurado (opcional pero recomendado)
- Mínimo 2GB RAM, 2 vCPU, 50GB almacenamiento

## 🔧 Paso 1: Preparar el Servidor

### 1.1 Actualizar el sistema
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar dependencias básicas
```bash
sudo apt install -y \
    git \
    curl \
    wget \
    build-essential \
    python3.11 \
    python3.11-venv \
    python3-pip \
    postgresql \
    postgresql-contrib \
    nginx \
    redis-server \
    certbot \
    python3-certbot-nginx \
    docker.io \
    docker-compose
```

### 1.3 Configurar Docker (si no está configurado)
```bash
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# Cerrar sesión y volver a entrar para aplicar cambios
```

### 1.4 Crear usuario para la aplicación (opcional pero recomendado)
```bash
sudo adduser --disabled-password --gecos "" appuser
sudo usermod -aG docker appuser
sudo su - appuser
```

## 🗄️ Paso 2: Configurar PostgreSQL

### 2.1 Crear base de datos y usuario
```bash
sudo -u postgres psql
```

Dentro de PostgreSQL:
```sql
CREATE DATABASE trayectoria_estudiantil;
CREATE USER trayectoria_user WITH PASSWORD 'TU_PASSWORD_SEGURO_AQUI';
ALTER ROLE trayectoria_user SET client_encoding TO 'utf8';
ALTER ROLE trayectoria_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE trayectoria_user SET timezone TO 'America/Bogota';
GRANT ALL PRIVILEGES ON DATABASE trayectoria_estudiantil TO trayectoria_user;
\q
```

### 2.2 Configurar PostgreSQL para conexiones remotas (si es necesario)
```bash
sudo nano /etc/postgresql/15/main/postgresql.conf
# Buscar y descomentar: listen_addresses = 'localhost'
```

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Agregar al final:
# host    trayectoria_estudiantil    trayectoria_user    127.0.0.1/32    md5
```

```bash
sudo systemctl restart postgresql
```

## 📦 Paso 3: Clonar y Preparar el Proyecto

### 3.1 Clonar el repositorio
```bash
cd /opt
sudo git clone https://github.com/TU_USUARIO/TU_REPO.git trayectoria-app
sudo chown -R $USER:$USER trayectoria-app
cd trayectoria-app
```

### 3.2 Crear archivo de variables de entorno para producción
```bash
cd backend
cp env.example .env  # Copiar el archivo de ejemplo
nano .env  # Editar con tus valores
```

**⚠️ IMPORTANTE:** El archivo `.env` debe estar en `backend/.env` y debe contener todas las variables necesarias, especialmente `DB_PASSWORD`.

**Configuración mínima del archivo `backend/.env`:**
```env
# Seguridad
SECRET_KEY=tu-clave-secreta-muy-larga-y-aleatoria-aqui-genera-una-nueva
DEBUG=False

# Hosts permitidos (reemplaza con tu dominio o IP)
ALLOWED_HOSTS=tu-dominio.com,www.tu-dominio.com,tu-ip-publica

# Base de datos - IMPORTANTE: Configurar DB_PASSWORD
DB_ENGINE=django.db.backends.postgresql
DB_NAME=trayectoria_estudiantil
DB_USER=trayectoria_user
DB_PASSWORD=TU_PASSWORD_SEGURO_AQUI  # ⚠️ NO DEJAR VACÍO
DB_HOST=localhost
DB_PORT=5432

# CORS - IMPORTANTE: Configurar con tu dominio
CORS_ALLOWED_ORIGINS=https://tu-dominio.com,https://www.tu-dominio.com

# Redis (para Celery)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

**Nota:** El archivo `docker-compose.prod.yml` lee las variables desde `backend/.env`, por lo que es importante que este archivo exista y contenga todas las variables necesarias, especialmente `DB_PASSWORD`.

**⚠️ IMPORTANTE:** 
- Genera una `SECRET_KEY` segura: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- Reemplaza `tu-dominio.com` con tu dominio real o IP pública
- Si no tienes dominio, usa tu IP pública en `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS`

### 3.3 Configurar CORS para permitir cualquier IP (si es necesario)
Si necesitas acceso desde cualquier IP (no recomendado para producción), puedes modificar `backend/config/settings.py`:

```python
# Solo si realmente necesitas acceso desde cualquier IP
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
```

Y en el `.env`:
```env
CORS_ALLOW_ALL_ORIGINS=True
```

**⚠️ ADVERTENCIA:** Esto permite acceso desde cualquier origen. Úsalo solo si es absolutamente necesario.

## 🐳 Paso 4: Desplegar con Docker (Recomendado)

### 4.1 Crear docker-compose para producción
Crea `docker-compose.prod.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: trayectoria_db_prod
    environment:
      POSTGRES_DB: trayectoria_estudiantil
      POSTGRES_USER: trayectoria_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
    networks:
      - trayectoria_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trayectoria_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: trayectoria_redis_prod
    networks:
      - trayectoria_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: trayectoria_backend_prod
    command: >
      sh -c "python manage.py migrate --noinput &&
             python manage.py collectstatic --noinput &&
             gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"
    volumes:
      - ./backend:/app
      - static_volume_prod:/app/staticfiles
      - media_volume_prod:/app/media
    env_file:
      - ./backend/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - trayectoria_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: trayectoria_frontend_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend/nginx.prod.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    networks:
      - trayectoria_network
    restart: unless-stopped

volumes:
  postgres_data_prod:
  static_volume_prod:
  media_volume_prod:

networks:
  trayectoria_network:
    driver: bridge
```

### 4.2 Construir y levantar servicios

**Opción A: Despliegue en segundo plano (Recomendado para builds largos)**
```bash
# Ejecuta en background - puedes cerrar la consola SSH
chmod +x scripts/deploy-background.sh
./scripts/deploy-background.sh

# Verificar progreso (desde otra terminal o después de reconectar)
./scripts/check-deploy.sh

# Ver log en tiempo real
tail -f logs/deploy_*.log
```

**Opción B: Despliegue interactivo (ver progreso en tiempo real)**
```bash
# El script maneja todo automáticamente y guarda logs
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

**Opción C: Manual**
```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

**Opción D: Usar screen o tmux (Alternativa avanzada)**
```bash
# Con screen
screen -S deploy
./scripts/deploy.sh
# Presiona Ctrl+A luego D para desconectar
# Reconectar: screen -r deploy

# Con tmux
tmux new-session -s deploy
./scripts/deploy.sh
# Presiona Ctrl+B luego D para desconectar
# Reconectar: tmux attach -t deploy
```

### 4.3 Crear superusuario
```bash
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

## 🌐 Paso 5: Configurar Nginx (Sin Docker)

Si prefieres no usar Docker para Nginx y configurarlo directamente en el servidor:

### 5.1 Crear configuración de Nginx
```bash
sudo nano /etc/nginx/sites-available/trayectoria
```

```nginx
# Redirección HTTP a HTTPS (si tienes SSL)
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Si tienes SSL, redirige a HTTPS
    return 301 https://$server_name$request_uri;
    
    # Si no tienes SSL, comenta la línea anterior y descomenta lo siguiente:
    # location / {
    #     proxy_pass http://127.0.0.1:8000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     proxy_set_header X-Forwarded-Proto $scheme;
    # }
}

# Configuración HTTPS (si tienes SSL)
server {
    listen 443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Archivos estáticos del frontend (si construiste el frontend)
    root /var/www/trayectoria/dist/trayectoria-estudiantil;
    index index.html;

    # Frontend Angular
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Archivos estáticos del backend
    location /static/ {
        alias /opt/trayectoria-app/backend/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Archivos media del backend
    location /media/ {
        alias /opt/trayectoria-app/backend/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
```

### 5.2 Habilitar el sitio
```bash
sudo ln -s /etc/nginx/sites-available/trayectoria /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Paso 6: Configurar SSL con Let's Encrypt (Recomendado)

### 6.1 Obtener certificado SSL
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

### 6.2 Renovación automática
```bash
sudo certbot renew --dry-run
```

El certificado se renovará automáticamente.

## 🚀 Paso 7: Desplegar sin Docker (Alternativa)

### 7.1 Configurar entorno virtual de Python
```bash
cd /opt/trayectoria-app/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 7.2 Ejecutar migraciones
```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### 7.3 Configurar Gunicorn como servicio systemd
```bash
sudo nano /etc/systemd/system/trayectoria.service
```

```ini
[Unit]
Description=Trayectoria Estudiantil Gunicorn daemon
After=network.target postgresql.service

[Service]
User=appuser
Group=appuser
WorkingDirectory=/opt/trayectoria-app/backend
Environment="PATH=/opt/trayectoria-app/backend/venv/bin"
ExecStart=/opt/trayectoria-app/backend/venv/bin/gunicorn \
    --workers 3 \
    --timeout 120 \
    --bind 127.0.0.1:8000 \
    --access-logfile /var/log/trayectoria/access.log \
    --error-logfile /var/log/trayectoria/error.log \
    config.wsgi:application

Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/log/trayectoria
sudo chown appuser:appuser /var/log/trayectoria
sudo systemctl daemon-reload
sudo systemctl enable trayectoria
sudo systemctl start trayectoria
sudo systemctl status trayectoria
```

### 7.4 Construir frontend para producción
```bash
cd /opt/trayectoria-app/frontend
npm install
npm run build -- --configuration=production
sudo cp -r dist/trayectoria-estudiantil/* /var/www/trayectoria/
```

## 🔍 Paso 8: Verificar y Probar

### 8.1 Verificar servicios
```bash
# Verificar que todos los servicios estén corriendo
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis
sudo systemctl status trayectoria  # Si usas systemd

# O si usas Docker
docker compose -f docker-compose.prod.yml ps
```

### 8.2 Verificar logs
```bash
# Logs de Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Logs de Django/Gunicorn
sudo journalctl -u trayectoria -f

# O si usas Docker
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 8.3 Probar la aplicación
- Frontend: `http://tu-dominio.com` o `https://tu-dominio.com`
- Backend API: `http://tu-dominio.com/api/v1/`
- Admin Django: `http://tu-dominio.com/admin/`

## 🔥 Paso 9: Configurar Firewall

### 9.1 Configurar UFW
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

## 📊 Paso 10: Monitoreo y Mantenimiento

### 10.1 Script de backup de base de datos
Crea `/opt/trayectoria-app/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/trayectoria"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup de PostgreSQL
docker compose -f /opt/trayectoria-app/docker-compose.prod.yml exec -T db pg_dump -U trayectoria_user trayectoria_estudiantil > $BACKUP_DIR/db_$DATE.sql

# O si no usas Docker:
# pg_dump -U trayectoria_user trayectoria_estudiantil > $BACKUP_DIR/db_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/db_$DATE.sql

# Eliminar backups antiguos (más de 30 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completado: $BACKUP_DIR/db_$DATE.sql.gz"
```

```bash
chmod +x /opt/trayectoria-app/scripts/backup.sh
```

### 10.2 Agregar a crontab para backups automáticos
```bash
crontab -e
# Agregar línea para backup diario a las 2 AM
0 2 * * * /opt/trayectoria-app/scripts/backup.sh
```

## ⚠️ Checklist de Seguridad

- [ ] `DEBUG=False` en producción
- [ ] `SECRET_KEY` única y segura
- [ ] `ALLOWED_HOSTS` configurado correctamente
- [ ] `CORS_ALLOWED_ORIGINS` configurado (no usar `*`)
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado (UFW)
- [ ] Contraseñas de base de datos seguras
- [ ] Usuario no-root para la aplicación
- [ ] Logs configurados y monitoreados
- [ ] Backups automáticos configurados

## ⚡ Optimizaciones para Recursos Limitados (2GB RAM)

Si tu droplet tiene **2GB RAM o menos**, el build del frontend puede saturar el servidor. Se han implementado las siguientes optimizaciones:

### Optimizaciones Implementadas

1. **Configuración de Build "Light"**: 
   - Desactiva `buildOptimizer` (muy pesado en memoria)
   - Mantiene optimizaciones básicas (scripts, styles, fonts)
   - Reduce uso de memoria durante el build

2. **Límite de Memoria Node.js**: 
   - Reducido a 1.5GB (en lugar de 4GB)
   - Deja espacio para el sistema operativo y Docker

3. **Logging a Archivo**: 
   - Todos los logs del despliegue se guardan en `logs/deploy_YYYYMMDD_HHMMSS.log`
   - Permite revisar errores incluso si el servidor se satura

4. **Límites de Memoria en Docker**: 
   - El contenedor frontend tiene límite de 2GB
   - Reserva mínima de 512MB

### Uso del Script de Despliegue

**Despliegue en segundo plano (puedes cerrar SSH):**
```bash
chmod +x scripts/deploy-background.sh
./scripts/deploy-background.sh

# Verificar estado (desde otra terminal o después de reconectar)
./scripts/check-deploy.sh

# Ver log en tiempo real
tail -f logs/deploy_*.log
```

**Despliegue interactivo (ver progreso en tiempo real):**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

El script incluye:
- Verificación de memoria antes del build
- Logging completo a archivo
- Manejo de errores mejorado
- Soporte para ejecución en background

**Ver logs después del despliegue:**
```bash
# Ver el último log
ls -lt logs/ | head -1
cat logs/deploy_*.log | tail -100

# Verificar si hay un despliegue en progreso
./scripts/check-deploy.sh
```

### Si el Build Sigue Fallando

**Opción 1: Build Local (Recomendado para recursos limitados)**
```bash
# En tu máquina local (con más recursos)
cd frontend
npm install
npm run build -- --configuration=light --output-path=dist/trayectoria-estudiantil

# Copiar solo los archivos compilados al servidor
scp -r dist/trayectoria-estudiantil/* usuario@servidor:/ruta/al/proyecto/frontend/dist/trayectoria-estudiantil/

# En el servidor, reconstruir solo la imagen Nginx (sin build de Angular)
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

**Opción 2: Aumentar Recursos del Droplet**
- Actualizar a 4GB RAM o más
- Digital Ocean permite hacer resize del droplet fácilmente

**Opción 3: Usar Build en Etapas**
```bash
# Construir solo el backend primero
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml up -d db redis backend

# Luego construir el frontend en otro momento
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

### Monitoreo Durante el Build

En otra terminal SSH, puedes monitorear recursos:
```bash
# Ver uso de memoria
watch -n 1 free -h

# Ver procesos Docker
docker stats

# Ver logs en tiempo real
tail -f logs/deploy_*.log
```

## 🐛 Solución de Problemas

### Error de CORS
- Verifica que `CORS_ALLOWED_ORIGINS` incluya tu dominio exacto (con https://)
- Verifica que `ALLOWED_HOSTS` incluya tu dominio

### Error 502 Bad Gateway
- Verifica que Gunicorn/Django esté corriendo: `sudo systemctl status trayectoria`
- Verifica logs: `sudo journalctl -u trayectoria -n 50`

### Base de datos no conecta
- Verifica que PostgreSQL esté corriendo: `sudo systemctl status postgresql`
- Verifica credenciales en `.env`
- Prueba conexión: `psql -U trayectoria_user -d trayectoria_estudiantil`

### Frontend no carga
- Verifica que Nginx esté corriendo: `sudo systemctl status nginx`
- Verifica permisos: `sudo chown -R www-data:www-data /var/www/trayectoria`
- Verifica logs de Nginx: `sudo tail -f /var/log/nginx/error.log`

### Build del Frontend Satura el Servidor (2GB RAM)
- **Síntoma**: El servidor se vuelve inaccesible durante el build, no responde SSH
- **Causa**: El build de Angular requiere mucha memoria
- **Solución**: 
  1. Revisa el log del despliegue: `cat logs/deploy_*.log | tail -100`
  2. Usa build local y copia archivos (ver sección "Optimizaciones para Recursos Limitados")
  3. O aumenta recursos del droplet a 4GB+ RAM
  4. El build ahora usa configuración "light" que requiere menos memoria

### Error "JavaScript heap out of memory"
- Ya está solucionado con `NODE_OPTIONS="--max-old-space-size=1536"` en el Dockerfile
- Si persiste, considera build local o aumentar recursos del servidor

## 📝 Notas Adicionales

- **Actualizaciones**: Para actualizar el código, haz `git pull` y reconstruye los contenedores Docker o reinicia los servicios
- **Migraciones**: Siempre ejecuta `python manage.py migrate` después de actualizar
- **Estáticos**: Ejecuta `python manage.py collectstatic` si cambias archivos estáticos
- **Performance**: Considera usar un CDN para archivos estáticos en producción

## 🆘 Soporte

Si encuentras problemas, revisa los logs y verifica cada paso de esta guía.

