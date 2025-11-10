"""
Servicio ETL para procesar archivos de datos estudiantiles
Extract - Transform - Load
"""
import pandas as pd
import numpy as np
from django.conf import settings
from django.utils import timezone
from .models import DatosEstudiante, EsquemaDatos
import logging

logger = logging.getLogger(__name__)


class ETLService:
    """
    Servicio para extraer, transformar y cargar datos de estudiantes
    """
    
    # Mapeo de columnas del Excel a campos del modelo
    COLUMN_MAPPING = {
        'PROGRAMA': 'programa',
        'FACULTAD': 'facultad',
        'PERIODO_INGRESO': 'periodo_ingreso',
        'ULTIMO_PERIODO_ESTADO': 'ultimo_periodo_estado',
        'ULTIMO_ESTADO': 'ultimo_estado',
        'DESERTOR': 'desertor',
        'ESTADO_MODIFICADO': 'estado_modificado',
        'TIPO_DESERCION': 'tipo_desercion',
        'FALTA_REGISTRO': 'falta_registro',
        'conteo_BAJO_RENDIMIENTO': 'conteo_bajo_rendimiento',
        'conteo_SEMESTRES_CANCELADOS': 'conteo_semestres_cancelados',
        'conteo_MATRICULADO': 'conteo_matriculado',
        'conteo_NO REALIZO PAGO': 'conteo_no_realizo_pago',
        'CANTIDAD_PAGOS_MATRICULAS': 'cantidad_pagos_matriculas',
        'SEMESTRES_REGISTRADOS': 'semestres_registrados',
        'SEXO': 'sexo',
        'ESTRATO': 'estrato',
        'EDAD_INGRESO': 'edad_ingreso',
        'EDAD_ULTIMO_ESTADO': 'edad_ultimo_estado',
        'TIPO_INGRESO': 'tipo_ingreso',
        'TIPO_ADMISION': 'tipo_admision',
        'MODO_ADMISION': 'modo_admision',
        'LECTURA': 'lectura',
        'NATURALES': 'naturales',
        'IDIOMAS': 'idiomas',
        'SOCIALES': 'sociales',
        'PUNTAJE_PONDERADO': 'puntaje_ponderado',
        'ESTADO_CIVIL': 'estado_civil',
        'PROMEDIO_CARRERA': 'promedio_carrera',
        'PROMEDIO_PRIMER_SEMESTRE': 'promedio_primer_semestre',
        'TOTAL_CREDITOS': 'total_creditos',
        'CREDITOS_APROBADOS': 'creditos_aprobados',
        'CREDITOS_APROBADOS_PORCENTAJE': 'creditos_aprobados_porcentaje',
        'CREDITOS_FALTANTES': 'creditos_faltantes',
        'CREDITOS_FALTANTES_PORCENTAJE': 'creditos_faltantes_porcentaje',
        'CREDITO_ICETEX': 'credito_icetex',
        'CREDITOS_REPROBADOS': 'creditos_reprobados',
        'CANTIDAD_MATERIAS_REPROBADAS': 'cantidad_materias_reprobadas',
        'MATERIA_MAS_REPROBADA': 'materia_mas_reprobada',
        'CANTIDAD_MATERIA_MAS_REPROBADA': 'cantidad_materia_mas_reprobada',
        'DISCAPACIDAD': 'discapacidad',
        'GRUPO_POBLACIONAL': 'grupo_poblacional',
        'GRUPO_VICTIMA': 'grupo_victima',
        'GRUPO_ETNICO': 'grupo_etnico',
        'COMUNIDAD': 'comunidad',
        'HA_SOLICITADO_AYUDA_PSICO_PREU': 'ha_solicitado_ayuda_psico',
        'SISBEN': 'sisben',
        'MODALIDAD_GRADO': 'modalidad_grado',
        'TIPO_COLEGIO': 'tipo_colegio',
        'REPITIO_ANIO_COLEGIO': 'repitio_anio_colegio',
        'OCUPACION_PADRE': 'ocupacion_padre',
        'NIVEL_ED_PADRE': 'nivel_ed_padre',
        'OCUPACION_MADRE': 'ocupacion_madre',
        'NIVEL_ED_MADRE': 'nivel_ed_madre',
        'SITUACION_PADRES': 'situacion_padres',
        'TIPO_VIVIENDA': 'tipo_vivienda',
        'TIENE_HIJOS': 'tiene_hijos',
        'POLITICA_GRATUIDAD': 'politica_gratuidad',
        'DESCUENTO_EQUIDAD': 'descuento_equidad',
        'CREDITO_FES': 'credito_fes',
        'CREDITO_GOBERNACION': 'credito_gobernacion',
        'DESCUENTO_DEPORTE_CULTURA': 'descuento_deporte_cultura',
        'DESCUENTO_RENDIMIENTO_ACADEMICO_BECA': 'descuento_rendimiento_academico',
        'DESCUENTO_ELECTORAL': 'descuento_electoral',
        'DESCUENTO_ASEGURA_SOLIDARIA': 'descuento_asegura_solidaria',
        'DESCUENTO_CONFECOOP_CO_UNILLANOS': 'descuento_confecoop',
        'DESCUENTO_CONGENTE': 'descuento_congente',
        'DESCUENTO_EXCELENCIA': 'descuento_excelencia',
        'DESCUENTO_HERMANO_CONYUGE': 'descuento_hermano_conyuge',
        'APOYO_COORINOCO': 'apoyo_coorinoco',
        'DESCUENTO_REPRESENTANTE_ESTUDIANTIL': 'descuento_representante',
        'DESCUENTO_SOCIOECONOMICO': 'descuento_socioeconomico',
        'DESCUENTO_TRABAJO_GRADO': 'descuento_trabajo_grado',
        'ZONA': 'zona',
        'CIUDAD_NACIMIENTO': 'ciudad_nacimiento',
        'DEPARTAMENTO_NACIMIENTO': 'departamento_nacimiento',
        'CIUDAD_RESIDENCIA': 'ciudad_residencia',
        'DEPARTAMENTO_RESIDENCIA': 'departamento_residencia',
        'RESIDE_META': 'reside_meta',
        'RESIDE_VILLAVICENCIO': 'reside_villavicencio',
        'NACIO_VILLAVICENCIO': 'nacio_villavicencio',
        'NACIO_META': 'nacio_meta',
        'INGRESOS_DEPENDIENTES_TOTALES': 'ingresos_dependientes_totales',
    }
    
    def __init__(self, archivo_path):
        self.archivo_path = archivo_path
        self.df = None
        self.stats = {
            'registros_procesados': 0,
            'registros_insertados': 0,
            'columnas_procesadas': 0,
            'errores': []
        }
    
    def extract(self):
        """
        Paso 1: Extraer datos del archivo Excel o CSV
        """
        logger.info(f"Extrayendo datos de: {self.archivo_path}")
        
        try:
            if self.archivo_path.endswith('.xlsx'):
                self.df = pd.read_excel(self.archivo_path, engine='openpyxl')
            elif self.archivo_path.endswith('.csv'):
                self.df = pd.read_csv(self.archivo_path)
            else:
                raise ValueError("Formato de archivo no soportado. Use .xlsx o .csv")
            
            logger.info(f"Datos extraídos: {self.df.shape[0]} filas, {self.df.shape[1]} columnas")
            return True
            
        except Exception as e:
            logger.error(f"Error al extraer datos: {str(e)}")
            self.stats['errores'].append(f"Error en extracción: {str(e)}")
            return False
    
    # Límites de longitud para campos de texto
    FIELD_MAX_LENGTHS = {
        'programa': 200,
        'facultad': 200,
        'periodo_ingreso': 20,
        'ultimo_periodo_estado': 20,
        'ultimo_estado': 100,
        'estado_modificado': 100,
        'tipo_desercion': 100,
        'sexo': 20,
        'tipo_ingreso': 100,
        'tipo_admision': 100,
        'modo_admision': 100,
        'estado_civil': 50,
        'materia_mas_reprobada': 200,
        'grupo_poblacional': 100,
        'grupo_victima': 100,
        'grupo_etnico': 100,
        'comunidad': 100,
        'ha_solicitado_ayuda_psico': 50,
        'sisben': 50,
        'modalidad_grado': 100,
        'tipo_colegio': 50,
        'repitio_anio_colegio': 50,
        'ocupacion_padre': 100,
        'nivel_ed_padre': 100,
        'ocupacion_madre': 100,
        'nivel_ed_madre': 100,
        'situacion_padres': 100,
        'tipo_vivienda': 100,
        'tiene_hijos': 50,
        'credito_icetex': 50,
        'politica_gratuidad': 50,
        'descuento_equidad': 50,
        'credito_fes': 50,
        'credito_gobernacion': 50,
        'descuento_deporte_cultura': 50,
        'descuento_rendimiento_academico': 50,
        'descuento_electoral': 50,
        'descuento_asegura_solidaria': 50,
        'descuento_confecoop': 50,
        'descuento_congente': 50,
        'descuento_excelencia': 50,
        'descuento_hermano_conyuge': 50,
        'apoyo_coorinoco': 50,
        'descuento_representante': 50,
        'descuento_socioeconomico': 50,
        'descuento_trabajo_grado': 50,
        'zona': 50,
        'ciudad_nacimiento': 100,
        'departamento_nacimiento': 100,
        'ciudad_residencia': 100,
        'departamento_residencia': 100,
    }
    
    def transform(self):
        """
        Paso 2: Transformar y limpiar los datos
        - Eliminar datos sensibles
        - Limpiar valores nulos
        - Convertir tipos de datos
        - Normalizar valores
        - Truncar campos de texto
        """
        logger.info("Transformando datos...")
        
        try:
            # 1. Eliminar columnas sensibles (CRÍTICO PARA PRIVACIDAD)
            sensitive_fields = settings.SENSITIVE_FIELDS
            for field in sensitive_fields:
                if field in self.df.columns:
                    self.df = self.df.drop(columns=[field])
                    logger.info(f"Columna sensible eliminada: {field}")
            
            # 2. Filtrar solo columnas que están en el mapeo
            columnas_validas = [col for col in self.df.columns if col in self.COLUMN_MAPPING]
            self.df = self.df[columnas_validas]
            
            # 3. Renombrar columnas según el mapeo
            self.df = self.df.rename(columns=self.COLUMN_MAPPING)
            
            # 4. Limpiar valores nulos en campos de texto
            for col in self.df.select_dtypes(include=['object']).columns:
                self.df[col] = self.df[col].fillna('NO REGISTRA')
            
            # 5. Limpiar valores nulos en campos numéricos
            for col in self.df.select_dtypes(include=[np.number]).columns:
                self.df[col] = self.df[col].fillna(0)
            
            # 6. Truncar campos de texto según límites del modelo
            for col in self.df.select_dtypes(include=['object']).columns:
                if col in self.FIELD_MAX_LENGTHS:
                    max_len = self.FIELD_MAX_LENGTHS[col]
                    # Truncar valores que excedan el límite
                    self.df[col] = self.df[col].astype(str).str[:max_len]
                    # Contar cuántos fueron truncados
                    truncados = (self.df[col].str.len() == max_len).sum()
                    if truncados > 0:
                        logger.warning(f"Campo '{col}': {truncados} valores truncados a {max_len} caracteres")
            
            # 7. Normalizar el campo SEXO
            if 'sexo' in self.df.columns:
                self.df['sexo'] = self.df['sexo'].replace({
                    'M': 'Hombre',
                    'F': 'Mujer',
                    'NO REGISTRA': 'No registrado'
                })
            
            # 8. Convertir tipos de datos explícitamente
            # Asegurar que desertor sea entero
            if 'desertor' in self.df.columns:
                self.df['desertor'] = self.df['desertor'].astype(int)
            
            self.stats['registros_procesados'] = len(self.df)
            self.stats['columnas_procesadas'] = len(self.df.columns)
            
            logger.info(f"Transformación completada: {self.stats['registros_procesados']} registros, "
                       f"{self.stats['columnas_procesadas']} columnas")
            return True
            
        except Exception as e:
            logger.error(f"Error al transformar datos: {str(e)}", exc_info=True)
            self.stats['errores'].append(f"Error en transformación: {str(e)}")
            return False
    
    def load(self):
        """
        Paso 3: Cargar datos en la base de datos
        - Eliminar datos antiguos
        - Insertar nuevos datos
        - Actualizar esquema de datos
        """
        logger.info("Cargando datos en la base de datos...")
        
        try:
            # 1. Eliminar datos antiguos (TRUNCATE)
            DatosEstudiante.objects.all().delete()
            logger.info("Datos antiguos eliminados")
            
            # 2. Preparar datos para inserción en lote (bulk_create)
            registros_a_insertar = []
            errores_preparacion = 0
            
            for idx, row in self.df.iterrows():
                try:
                    # Convertir la fila a dict y limpiar valores
                    row_dict = row.to_dict()
                    
                    # Asegurar que valores numéricos sean del tipo correcto
                    for key, value in row_dict.items():
                        if pd.isna(value):
                            # Reemplazar NaN según el tipo de campo
                            if key in ['desertor', 'estrato', 'edad_ingreso', 'edad_ultimo_estado',
                                      'falta_registro', 'conteo_bajo_rendimiento', 'conteo_semestres_cancelados',
                                      'conteo_matriculado', 'conteo_no_realizo_pago', 'cantidad_pagos_matriculas',
                                      'semestres_registrados', 'lectura', 'naturales', 'total_creditos',
                                      'creditos_aprobados', 'creditos_faltantes', 'creditos_reprobados',
                                      'cantidad_materias_reprobadas', 'cantidad_materia_mas_reprobada',
                                      'discapacidad', 'reside_meta', 'reside_villavicencio',
                                      'nacio_villavicencio', 'nacio_meta']:
                                row_dict[key] = 0
                            elif key in ['promedio_carrera', 'promedio_primer_semestre',
                                        'creditos_aprobados_porcentaje', 'creditos_faltantes_porcentaje',
                                        'idiomas', 'sociales', 'puntaje_ponderado']:
                                row_dict[key] = 0.0
                            elif key == 'ingresos_dependientes_totales':
                                row_dict[key] = 0
                            else:
                                row_dict[key] = 'NO REGISTRA'
                    
                    registro = DatosEstudiante(**row_dict)
                    registros_a_insertar.append(registro)
                    
                except Exception as e:
                    errores_preparacion += 1
                    if errores_preparacion <= 10:  # Solo loguear los primeros 10 errores
                        logger.warning(f"Error al preparar registro {idx}: {str(e)}")
                    self.stats['errores'].append(f"Fila {idx}: {str(e)[:100]}")
            
            if errores_preparacion > 10:
                logger.warning(f"Total de errores de preparación: {errores_preparacion}")
            
            # 3. Insertar en lote (mucho más rápido que uno por uno)
            if registros_a_insertar:
                try:
                    DatosEstudiante.objects.bulk_create(registros_a_insertar, batch_size=1000)
                    self.stats['registros_insertados'] = len(registros_a_insertar)
                    logger.info(f"{self.stats['registros_insertados']} registros insertados exitosamente")
                except Exception as e:
                    logger.error(f"Error en bulk_create: {str(e)}", exc_info=True)
                    self.stats['errores'].append(f"Error en inserción masiva: {str(e)}")
                    return False
            else:
                logger.warning("No hay registros para insertar")
                self.stats['errores'].append("No se pudieron preparar registros para inserción")
                return False
            
            # 4. Actualizar esquema de datos
            self._actualizar_esquema()
            
            return True
            
        except Exception as e:
            logger.error(f"Error al cargar datos: {str(e)}", exc_info=True)
            self.stats['errores'].append(f"Error en carga: {str(e)}")
            return False
    
    def _actualizar_esquema(self):
        """
        Actualizar la tabla de esquema de datos con información de columnas
        """
        logger.info("Actualizando esquema de datos...")
        
        # Eliminar esquema anterior
        EsquemaDatos.objects.all().delete()
        
        esquemas = []
        
        for columna in self.df.columns:
            tipo_dato = self._detectar_tipo_dato(columna)
            valores_unicos = None
            cantidad_valores_unicos = self.df[columna].nunique()
            valor_minimo = None
            valor_maximo = None
            
            # Si es categórico y tiene menos de CATEGORICAL_THRESHOLD valores únicos, guardar la lista
            if tipo_dato == 'categorico' and cantidad_valores_unicos < settings.CATEGORICAL_THRESHOLD:
                valores_unicos = self.df[columna].unique().tolist()
                # Convertir numpy types a Python types
                valores_unicos = [str(v) for v in valores_unicos]
            
            # Si es numérico, calcular min y max
            if tipo_dato == 'numerico':
                valor_minimo = float(self.df[columna].min())
                valor_maximo = float(self.df[columna].max())
            
            esquema = EsquemaDatos(
                nombre_columna=columna,
                tipo_dato=tipo_dato,
                valores_unicos=valores_unicos,
                cantidad_valores_unicos=cantidad_valores_unicos,
                valor_minimo=valor_minimo,
                valor_maximo=valor_maximo,
                es_filtrable=True,
                es_visualizable=True
            )
            esquemas.append(esquema)
        
        EsquemaDatos.objects.bulk_create(esquemas)
        logger.info(f"Esquema actualizado con {len(esquemas)} columnas")
    
    def _detectar_tipo_dato(self, columna):
        """
        Detectar el tipo de dato de una columna
        """
        dtype = self.df[columna].dtype
        
        if pd.api.types.is_numeric_dtype(dtype):
            return 'numerico'
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            return 'fecha'
        else:
            return 'categorico'
    
    def ejecutar_etl(self):
        """
        Ejecutar todo el proceso ETL
        """
        logger.info("=" * 80)
        logger.info("INICIANDO PROCESO ETL")
        logger.info("=" * 80)
        
        # Extract
        if not self.extract():
            return False, self.stats
        
        # Transform
        if not self.transform():
            return False, self.stats
        
        # Load
        if not self.load():
            return False, self.stats
        
        logger.info("=" * 80)
        logger.info("PROCESO ETL COMPLETADO EXITOSAMENTE")
        logger.info(f"Registros procesados: {self.stats['registros_procesados']}")
        logger.info(f"Registros insertados: {self.stats['registros_insertados']}")
        logger.info(f"Columnas procesadas: {self.stats['columnas_procesadas']}")
        logger.info("=" * 80)
        
        return True, self.stats


def procesar_archivo(archivo_path):
    """
    Función auxiliar para procesar un archivo
    """
    etl = ETLService(archivo_path)
    exito, stats = etl.ejecutar_etl()
    return exito, stats

