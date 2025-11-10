from django.apps import AppConfig


class DataManagerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.data_manager'
    verbose_name = 'Gestor de Datos'
    
    def ready(self):
        import apps.data_manager.signals  # noqa

