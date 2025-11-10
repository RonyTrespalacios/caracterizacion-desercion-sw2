"""
Configuración de Gunicorn para producción
"""
import multiprocessing
import os

# Configuración del servidor
bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Procesamiento
preload_app = True
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (si es necesario)
# keyfile = "/path/to/keyfile"
# certfile = "/path/to/certfile"

