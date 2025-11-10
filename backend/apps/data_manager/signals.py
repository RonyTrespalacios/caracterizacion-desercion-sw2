"""
Señales para disparar el proceso ETL cuando se carga un archivo
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from .models import FuenteDatos
from .etl_service import procesar_archivo
import logging

logger = logging.getLogger(__name__)


def _ejecutar_etl(instance_id):
    """
    Función auxiliar para ejecutar ETL fuera de la transacción principal
    """
    try:
        instance = FuenteDatos.objects.get(id=instance_id)
        
        if instance.procesado:
            logger.info(f"FuenteDatos {instance_id} ya fue procesada, omitiendo")
            return
        
        logger.info(f"Iniciando proceso ETL para archivo: {instance.archivo.path}")
        
        try:
            exito, stats = procesar_archivo(instance.archivo.path)
            
            # Actualizar el registro con los resultados
            # Usar update() en lugar de save() para evitar disparar señales nuevamente
            if exito:
                FuenteDatos.objects.filter(id=instance_id).update(
                    procesado=True,
                    fecha_procesamiento=timezone.now(),
                    num_registros=stats['registros_insertados'],
                    num_columnas=stats['columnas_procesadas'],
                    mensaje_error=None
                )
                logger.info(f"Proceso ETL completado exitosamente: {stats['registros_insertados']} registros")
            else:
                error_msg = '; '.join(stats['errores'])[:500]  # Limitar longitud del mensaje
                FuenteDatos.objects.filter(id=instance_id).update(
                    procesado=False,
                    mensaje_error=error_msg
                )
                logger.error(f"Error en proceso ETL: {error_msg}")
            
        except Exception as e:
            error_msg = f"Error crítico: {str(e)}"[:500]
            logger.error(f"Error crítico en proceso ETL: {error_msg}", exc_info=True)
            FuenteDatos.objects.filter(id=instance_id).update(
                procesado=False,
                mensaje_error=error_msg
            )
    
    except FuenteDatos.DoesNotExist:
        logger.error(f"FuenteDatos {instance_id} no encontrada")
    except Exception as e:
        logger.error(f"Error inesperado al ejecutar ETL: {str(e)}", exc_info=True)


@receiver(post_save, sender=FuenteDatos)
def procesar_archivo_cargado(sender, instance, created, **kwargs):
    """
    Cuando se crea una nueva FuenteDatos, procesar el archivo automáticamente.
    Se ejecuta después de que la transacción se complete para evitar errores.
    """
    if created and not instance.procesado:
        logger.info(f"Nueva fuente de datos detectada: {instance.id}")
        # Ejecutar ETL después de que la transacción actual se complete
        transaction.on_commit(lambda: _ejecutar_etl(instance.id))

