"""
Configuración del admin de Django para data_manager
"""
from django.contrib import admin
from .models import FuenteDatos, DatosEstudiante, EsquemaDatos


@admin.register(FuenteDatos)
class FuenteDatosAdmin(admin.ModelAdmin):
    """
    Admin para gestionar la carga de archivos
    """
    list_display = ['id', 'fecha_carga', 'procesado', 'num_registros', 'num_columnas']
    list_filter = ['procesado', 'fecha_carga']
    readonly_fields = ['fecha_carga', 'procesado', 'fecha_procesamiento', 
                      'num_registros', 'num_columnas', 'mensaje_error']
    
    fieldsets = (
        ('Archivo', {
            'fields': ('archivo',)
        }),
        ('Estado del Procesamiento', {
            'fields': ('procesado', 'fecha_carga', 'fecha_procesamiento', 
                      'num_registros', 'num_columnas'),
        }),
        ('Errores', {
            'fields': ('mensaje_error',),
            'classes': ('collapse',)
        }),
    )


@admin.register(DatosEstudiante)
class DatosEstudianteAdmin(admin.ModelAdmin):
    """
    Admin para visualizar datos de estudiantes (solo lectura)
    """
    list_display = ['id', 'programa', 'facultad', 'periodo_ingreso', 'desertor', 
                   'promedio_carrera', 'sexo']
    list_filter = ['desertor', 'facultad', 'programa', 'sexo', 'periodo_ingreso']
    search_fields = ['programa', 'facultad']
    readonly_fields = [field.name for field in DatosEstudiante._meta.fields]
    
    def has_add_permission(self, request):
        # No permitir agregar manualmente (solo a través del ETL)
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Permitir eliminar (pero normalmente se hace a través del ETL)
        return True


@admin.register(EsquemaDatos)
class EsquemaDatosAdmin(admin.ModelAdmin):
    """
    Admin para visualizar el esquema de datos
    """
    list_display = ['nombre_columna', 'tipo_dato', 'es_filtrable', 'es_visualizable', 
                   'cantidad_valores_unicos']
    list_filter = ['tipo_dato', 'es_filtrable', 'es_visualizable']
    search_fields = ['nombre_columna']
    readonly_fields = ['nombre_columna', 'tipo_dato', 'valores_unicos', 
                      'cantidad_valores_unicos', 'valor_minimo', 'valor_maximo']
    
    def has_add_permission(self, request):
        # No permitir agregar manualmente (se crea automáticamente en el ETL)
        return False

