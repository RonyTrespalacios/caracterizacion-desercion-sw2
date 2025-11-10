"""
Configuración de Celery
"""
import os
from celery import Celery

# Configurar el módulo de settings de Django para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('trayectoria_estudiantil')

# Usar string de configuración significa que los workers no necesitan
# serializar el objeto de configuración
app.config_from_object('django.conf:settings', namespace='CELERY')

# Cargar módulos de tareas de todas las apps registradas
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

