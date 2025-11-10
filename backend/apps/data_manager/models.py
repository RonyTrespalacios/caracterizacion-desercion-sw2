"""
Modelos para el gestor de datos
"""
from django.db import models
from django.core.validators import FileExtensionValidator
from django.conf import settings


class FuenteDatos(models.Model):
    """
    Modelo para almacenar los archivos de datos cargados por el administrador
    """
    archivo = models.FileField(
        upload_to='uploads/',
        validators=[FileExtensionValidator(allowed_extensions=['xlsx', 'csv'])],
        help_text='Archivo Excel (.xlsx) o CSV con datos de estudiantes'
    )
    fecha_carga = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Carga')
    procesado = models.BooleanField(default=False, verbose_name='¿Procesado?')
    fecha_procesamiento = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de Procesamiento')
    num_registros = models.IntegerField(null=True, blank=True, verbose_name='Número de Registros')
    num_columnas = models.IntegerField(null=True, blank=True, verbose_name='Número de Columnas')
    mensaje_error = models.TextField(null=True, blank=True, verbose_name='Mensaje de Error')
    
    class Meta:
        verbose_name = 'Fuente de Datos'
        verbose_name_plural = 'Fuentes de Datos'
        ordering = ['-fecha_carga']
    
    def __str__(self):
        return f"Datos cargados el {self.fecha_carga.strftime('%Y-%m-%d %H:%M')}"


class DatosEstudiante(models.Model):
    """
    Modelo dinámico para almacenar los datos de estudiantes procesados.
    Esta tabla se llena después del proceso ETL.
    """
    # Información Académica
    programa = models.CharField(max_length=200, db_index=True)
    facultad = models.CharField(max_length=200, db_index=True)
    periodo_ingreso = models.CharField(max_length=20, db_index=True)
    ultimo_periodo_estado = models.CharField(max_length=20)
    ultimo_estado = models.CharField(max_length=100)
    
    # Variable Objetivo
    desertor = models.IntegerField(db_index=True, help_text='0: No desertor, 1: Desertor')
    estado_modificado = models.CharField(max_length=100, blank=True, null=True)
    tipo_desercion = models.CharField(max_length=100, blank=True, null=True)
    falta_registro = models.IntegerField(default=0)
    
    # Contadores de Estados
    conteo_bajo_rendimiento = models.IntegerField(default=0)
    conteo_semestres_cancelados = models.IntegerField(default=0)
    conteo_matriculado = models.IntegerField(default=0)
    conteo_no_realizo_pago = models.IntegerField(default=0)
    cantidad_pagos_matriculas = models.IntegerField(default=0)
    semestres_registrados = models.IntegerField(default=0)
    
    # Datos Demográficos
    sexo = models.CharField(max_length=20, db_index=True)
    estrato = models.IntegerField(db_index=True)
    edad_ingreso = models.IntegerField()
    edad_ultimo_estado = models.IntegerField()
    
    # Datos de Ingreso
    tipo_ingreso = models.CharField(max_length=100)
    tipo_admision = models.CharField(max_length=100)
    modo_admision = models.CharField(max_length=100)
    
    # Puntajes de Admisión
    lectura = models.IntegerField(null=True, blank=True)
    naturales = models.IntegerField(null=True, blank=True)
    idiomas = models.FloatField(null=True, blank=True)
    sociales = models.FloatField(null=True, blank=True)
    puntaje_ponderado = models.FloatField(null=True, blank=True)
    
    # Datos Académicos
    estado_civil = models.CharField(max_length=50)
    promedio_carrera = models.FloatField(db_index=True)
    promedio_primer_semestre = models.FloatField()
    total_creditos = models.IntegerField()
    creditos_aprobados = models.IntegerField()
    creditos_aprobados_porcentaje = models.FloatField()
    creditos_faltantes = models.IntegerField()
    creditos_faltantes_porcentaje = models.FloatField()
    creditos_reprobados = models.IntegerField(db_index=True)
    cantidad_materias_reprobadas = models.IntegerField(db_index=True)
    materia_mas_reprobada = models.CharField(max_length=200, blank=True, null=True)
    cantidad_materia_mas_reprobada = models.IntegerField(default=0)
    
    # Características Socioeconómicas
    discapacidad = models.IntegerField(default=0)
    grupo_poblacional = models.CharField(max_length=100)
    grupo_victima = models.CharField(max_length=100)
    grupo_etnico = models.CharField(max_length=100, db_index=True)
    comunidad = models.CharField(max_length=100)
    ha_solicitado_ayuda_psico = models.CharField(max_length=50)
    sisben = models.CharField(max_length=50)
    
    # Datos de Educación Secundaria
    modalidad_grado = models.CharField(max_length=100)
    tipo_colegio = models.CharField(max_length=50, db_index=True)
    repitio_anio_colegio = models.CharField(max_length=50)
    
    # Datos Familiares
    ocupacion_padre = models.CharField(max_length=100)
    nivel_ed_padre = models.CharField(max_length=100)
    ocupacion_madre = models.CharField(max_length=100)
    nivel_ed_madre = models.CharField(max_length=100)
    situacion_padres = models.CharField(max_length=100)
    tipo_vivienda = models.CharField(max_length=100)
    tiene_hijos = models.CharField(max_length=50)
    
    # Apoyos Financieros
    credito_icetex = models.CharField(max_length=50)
    politica_gratuidad = models.CharField(max_length=50)
    descuento_equidad = models.CharField(max_length=50)
    credito_fes = models.CharField(max_length=50)
    credito_gobernacion = models.CharField(max_length=50)
    descuento_deporte_cultura = models.CharField(max_length=50)
    descuento_rendimiento_academico = models.CharField(max_length=50)
    descuento_electoral = models.CharField(max_length=50)
    descuento_asegura_solidaria = models.CharField(max_length=50)
    descuento_confecoop = models.CharField(max_length=50)
    descuento_congente = models.CharField(max_length=50)
    descuento_excelencia = models.CharField(max_length=50)
    descuento_hermano_conyuge = models.CharField(max_length=50)
    apoyo_coorinoco = models.CharField(max_length=50)
    descuento_representante = models.CharField(max_length=50)
    descuento_socioeconomico = models.CharField(max_length=50)
    descuento_trabajo_grado = models.CharField(max_length=50)
    
    # Datos Geográficos
    zona = models.CharField(max_length=50)
    ciudad_nacimiento = models.CharField(max_length=100, blank=True, null=True)
    departamento_nacimiento = models.CharField(max_length=100, blank=True, null=True)
    ciudad_residencia = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    departamento_residencia = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    reside_meta = models.IntegerField(default=0)
    reside_villavicencio = models.IntegerField(default=0)
    nacio_villavicencio = models.IntegerField(default=0)
    nacio_meta = models.IntegerField(default=0)
    
    # Otros
    ingresos_dependientes_totales = models.BigIntegerField(default=0)
    
    # Metadata
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Datos de Estudiante'
        verbose_name_plural = 'Datos de Estudiantes'
        ordering = ['programa', 'periodo_ingreso']
        indexes = [
            models.Index(fields=['desertor', 'programa']),
            models.Index(fields=['desertor', 'facultad']),
            models.Index(fields=['periodo_ingreso', 'desertor']),
            models.Index(fields=['promedio_carrera', 'creditos_reprobados']),
        ]
    
    def __str__(self):
        return f"{self.programa} - {self.periodo_ingreso} - {'DESERTOR' if self.desertor else 'NO DESERTOR'}"


class EsquemaDatos(models.Model):
    """
    Modelo para almacenar metadatos sobre el esquema de datos
    (columnas, tipos, valores únicos, etc.)
    """
    nombre_columna = models.CharField(max_length=100, unique=True)
    tipo_dato = models.CharField(max_length=50)  # 'numerico', 'categorico', 'texto', 'fecha'
    es_filtrable = models.BooleanField(default=True)
    es_visualizable = models.BooleanField(default=True)
    valores_unicos = models.JSONField(null=True, blank=True, help_text='Lista de valores únicos si es categórico')
    cantidad_valores_unicos = models.IntegerField(null=True, blank=True)
    valor_minimo = models.FloatField(null=True, blank=True)
    valor_maximo = models.FloatField(null=True, blank=True)
    descripcion = models.TextField(blank=True, help_text='Descripción de la columna')
    
    class Meta:
        verbose_name = 'Esquema de Datos'
        verbose_name_plural = 'Esquemas de Datos'
        ordering = ['nombre_columna']
    
    def __str__(self):
        return f"{self.nombre_columna} ({self.tipo_dato})"

