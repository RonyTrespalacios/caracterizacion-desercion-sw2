"""
Views para la API de gestión de datos
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Avg, Sum, Count, Min, Max, Q
from django.db.models.functions import Coalesce
from .models import FuenteDatos, DatosEstudiante, EsquemaDatos
from .serializers import (
    FuenteDatosSerializer, 
    DatosEstudianteSerializer, 
    EsquemaDatosSerializer,
    ConsultaDinamicaSerializer
)
import logging

logger = logging.getLogger(__name__)


class FuenteDatosViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar la carga de archivos de datos
    Solo accesible para administradores
    """
    queryset = FuenteDatos.objects.all()
    serializer_class = FuenteDatosSerializer
    parser_classes = (MultiPartParser, FormParser)
    
    def create(self, request, *args, **kwargs):
        """
        Cargar un nuevo archivo de datos
        """
        logger.info("Recibida petición de carga de archivo")
        return super().create(request, *args, **kwargs)


class EsquemaDatosViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar el esquema de datos (metadatos)
    Endpoint: GET /api/v1/data/schema/
    """
    queryset = EsquemaDatos.objects.all()
    serializer_class = EsquemaDatosSerializer
    
    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Obtener un resumen del esquema de datos en formato optimizado para el frontend
        Endpoint: GET /api/v1/data/schema/resumen/
        """
        esquemas = EsquemaDatos.objects.all()
        
        resumen = {
            'columnas': [],
            'total_columnas': esquemas.count(),
            'columnas_filtrables': esquemas.filter(es_filtrable=True).count(),
            'columnas_numericas': esquemas.filter(tipo_dato='numerico').count(),
            'columnas_categoricas': esquemas.filter(tipo_dato='categorico').count(),
        }
        
        for esquema in esquemas:
            columna_info = {
                'nombre': esquema.nombre_columna,
                'tipo': esquema.tipo_dato,
                'filtrable': esquema.es_filtrable,
                'visualizable': esquema.es_visualizable,
            }
            
            # Agregar valores únicos solo si están disponibles
            if esquema.valores_unicos:
                columna_info['valores_unicos'] = esquema.valores_unicos
                columna_info['cantidad_valores_unicos'] = esquema.cantidad_valores_unicos
            else:
                columna_info['valores_unicos'] = None
                columna_info['cantidad_valores_unicos'] = esquema.cantidad_valores_unicos
            
            # Agregar rango para variables numéricas
            if esquema.tipo_dato == 'numerico':
                columna_info['valor_minimo'] = esquema.valor_minimo
                columna_info['valor_maximo'] = esquema.valor_maximo
            
            resumen['columnas'].append(columna_info)
        
        return Response(resumen)


class DatosEstudianteViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar datos de estudiantes
    """
    queryset = DatosEstudiante.objects.all()
    serializer_class = DatosEstudianteSerializer
    
    @action(detail=False, methods=['get'])
    def estadisticas(self, request):
        """
        Obtener estadísticas generales de los datos
        Endpoint: GET /api/v1/data/estudiantes/estadisticas/
        """
        total = DatosEstudiante.objects.count()
        desertores = DatosEstudiante.objects.filter(desertor=1).count()
        no_desertores = DatosEstudiante.objects.filter(desertor=0).count()
        
        estadisticas = {
            'total_estudiantes': total,
            'desertores': desertores,
            'no_desertores': no_desertores,
            'porcentaje_desercion': round((desertores / total * 100) if total > 0 else 0, 2),
            'facultades': DatosEstudiante.objects.values('facultad').distinct().count(),
            'programas': DatosEstudiante.objects.values('programa').distinct().count(),
            'periodos': DatosEstudiante.objects.values('periodo_ingreso').distinct().count(),
        }
        
        return Response(estadisticas)
    
    @action(detail=False, methods=['post'])
    def consulta_dinamica(self, request):
        """
        Realizar una consulta dinámica con filtros, agrupaciones y métricas
        
        Endpoint: POST /api/v1/data/estudiantes/consulta_dinamica/
        
        Body JSON:
        {
            "dimensiones": ["facultad", "programa"],
            "metricas": ["AVG(promedio_carrera)", "COUNT(id)"],
            "filtros": [
                {"columna": "desertor", "operador": "eq", "valor": 1},
                {"columna": "promedio_carrera", "operador": "gte", "valor": 3.5}
            ],
            "orden": "promedio_carrera",
            "limite": 100
        }
        """
        serializer = ConsultaDinamicaSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {'error': 'Datos de consulta inválidos', 'detalles': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        datos_validados = serializer.validated_data
        
        try:
            resultado = self._construir_consulta_segura(datos_validados)
            return Response(resultado)
            
        except Exception as e:
            logger.error(f"Error en consulta dinámica: {str(e)}")
            return Response(
                {'error': 'Error al procesar consulta', 'detalle': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _construir_consulta_segura(self, datos):
        """
        Construir una consulta segura usando el ORM de Django
        NUNCA usar SQL directo para prevenir inyección SQL
        """
        queryset = DatosEstudiante.objects.all()
        
        # 1. Aplicar filtros
        if 'filtros' in datos and datos['filtros']:
            queryset = self._aplicar_filtros(queryset, datos['filtros'])
        
        # 2. Si hay dimensiones (agrupación)
        if 'dimensiones' in datos and datos['dimensiones']:
            return self._consulta_agregada(queryset, datos)
        
        # 3. Si no hay dimensiones, retornar datos filtrados
        else:
            limite = datos.get('limite', 1000)
            if 'orden' in datos and datos['orden']:
                queryset = queryset.order_by(datos['orden'])
            
            queryset = queryset[:limite]
            serializer = DatosEstudianteSerializer(queryset, many=True)
            return {
                'tipo': 'datos_crudos',
                'datos': serializer.data,
                'total': queryset.count()
            }
    
    def _aplicar_filtros(self, queryset, filtros):
        """
        Aplicar filtros de forma segura usando el ORM
        """
        for filtro in filtros:
            columna = filtro['columna']
            operador = filtro['operador']
            valor = filtro['valor']
            
            # Validar que la columna existe en el modelo
            if not hasattr(DatosEstudiante, columna):
                logger.warning(f"Intento de filtrar por columna inexistente: {columna}")
                continue
            
            # Construir el filtro según el operador
            if operador == 'eq':
                queryset = queryset.filter(**{columna: valor})
            elif operador == 'ne':
                queryset = queryset.exclude(**{columna: valor})
            elif operador == 'gt':
                queryset = queryset.filter(**{f"{columna}__gt": valor})
            elif operador == 'gte':
                queryset = queryset.filter(**{f"{columna}__gte": valor})
            elif operador == 'lt':
                queryset = queryset.filter(**{f"{columna}__lt": valor})
            elif operador == 'lte':
                queryset = queryset.filter(**{f"{columna}__lte": valor})
            elif operador == 'in':
                queryset = queryset.filter(**{f"{columna}__in": valor})
            elif operador == 'not_in':
                queryset = queryset.exclude(**{f"{columna}__in": valor})
            elif operador == 'contains':
                queryset = queryset.filter(**{f"{columna}__contains": valor})
            elif operador == 'icontains':
                queryset = queryset.filter(**{f"{columna}__icontains": valor})
        
        return queryset
    
    def _consulta_agregada(self, queryset, datos):
        """
        Realizar una consulta agregada con dimensiones y métricas
        """
        dimensiones = datos.get('dimensiones', [])
        metricas = datos.get('metricas', [])
        
        # Validar que las dimensiones existen
        for dim in dimensiones:
            if not hasattr(DatosEstudiante, dim):
                raise ValueError(f"Dimensión '{dim}' no existe en el modelo")
        
        # Agrupar por dimensiones
        queryset = queryset.values(*dimensiones)
        
        # Aplicar métricas (agregaciones)
        agregaciones = {}
        
        for metrica in metricas:
            metrica_upper = metrica.upper()
            
            # Parsear la métrica (ej: "AVG(promedio_carrera)")
            if 'AVG(' in metrica_upper:
                campo = metrica.split('(')[1].split(')')[0].strip()
                if hasattr(DatosEstudiante, campo):
                    agregaciones[f'avg_{campo}'] = Avg(campo)
            
            elif 'SUM(' in metrica_upper:
                campo = metrica.split('(')[1].split(')')[0].strip()
                if hasattr(DatosEstudiante, campo):
                    agregaciones[f'sum_{campo}'] = Sum(campo)
            
            elif 'COUNT(' in metrica_upper:
                campo = metrica.split('(')[1].split(')')[0].strip()
                if campo.lower() in ['id', '*']:
                    agregaciones['count'] = Count('id')
                elif hasattr(DatosEstudiante, campo):
                    agregaciones[f'count_{campo}'] = Count(campo)
            
            elif 'MIN(' in metrica_upper:
                campo = metrica.split('(')[1].split(')')[0].strip()
                if hasattr(DatosEstudiante, campo):
                    agregaciones[f'min_{campo}'] = Min(campo)
            
            elif 'MAX(' in metrica_upper:
                campo = metrica.split('(')[1].split(')')[0].strip()
                if hasattr(DatosEstudiante, campo):
                    agregaciones[f'max_{campo}'] = Max(campo)
        
        # Si no hay métricas, al menos contar
        if not agregaciones:
            agregaciones['count'] = Count('id')
        
        # Aplicar agregaciones
        queryset = queryset.annotate(**agregaciones)
        
        # Ordenar si se especifica
        if 'orden' in datos and datos['orden']:
            queryset = queryset.order_by(datos['orden'])
        
        # Limitar resultados
        limite = datos.get('limite', 1000)
        queryset = queryset[:limite]
        
        return {
            'tipo': 'datos_agregados',
            'dimensiones': dimensiones,
            'metricas': list(agregaciones.keys()),
            'datos': list(queryset),
            'total': queryset.count()
        }
    
    @action(detail=False, methods=['post'])
    def consulta_sin_agregar(self, request):
        """
        Retorna datos sin agregar (valores individuales) para boxplots y otros gráficos que necesitan datos crudos.
        """
        try:
            dimensiones = request.data.get('dimensiones', [])
            valores = request.data.get('valores', [])
            filtros = request.data.get('filtros', [])
            limite = request.data.get('limite', 5000)
            
            logger.info(f"📊 Consulta sin agregar - Dimensiones: {dimensiones}, Valores: {valores}, Límite: {limite}")
            
            if not dimensiones and not valores:
                return Response(
                    {'error': 'Se requiere al menos una dimensión o valor'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            queryset = DatosEstudiante.objects.all()
            
            if filtros:
                queryset = self._aplicar_filtros(queryset, filtros)
            
            columnas = list(set(dimensiones + valores))
            queryset = queryset.values(*columnas)[:limite]
            datos = list(queryset)
            
            logger.info(f"✅ Datos sin agregar obtenidos: {len(datos)} registros")
            
            return Response({
                'datos': datos,
                'total': len(datos),
                'columnas': columnas,
                'limitado': len(datos) >= limite
            })
            
        except Exception as e:
            logger.error(f"❌ Error en consulta sin agregar: {str(e)}")
            return Response(
                {'error': f'Error en consulta: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'post'])
    def valores_unicos(self, request):
        """
        Obtener valores únicos de una columna específica, opcionalmente aplicando filtros previos
        
        GET: /api/v1/data/estudiantes/valores_unicos/?columna=facultad&filtros=[{"columna":"facultad","operador":"eq","valor":"Ingeniería"}]
        POST: /api/v1/data/estudiantes/valores_unicos/
        Body: {"columna": "programa", "filtros": [{"columna": "facultad", "operador": "eq", "valor": "Ingeniería"}]}
        """
        # Obtener columna desde query params (GET) o body (POST)
        if request.method == 'GET':
            columna = request.query_params.get('columna')
            filtros_str = request.query_params.get('filtros')
            import json
            filtros = json.loads(filtros_str) if filtros_str else []
        else:
            columna = request.data.get('columna')
            filtros = request.data.get('filtros', [])
        
        if not columna:
            return Response(
                {'error': 'Debe especificar el parámetro "columna"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not hasattr(DatosEstudiante, columna):
            return Response(
                {'error': f'La columna "{columna}" no existe'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Construir queryset base
        queryset = DatosEstudiante.objects.all()
        
        # Aplicar filtros previos (excluyendo el filtro de la columna actual si existe)
        if filtros:
            # Validar estructura de filtros
            filtros_validos = []
            for f in filtros:
                if isinstance(f, dict) and 'columna' in f and 'operador' in f and 'valor' in f:
                    # Excluir el filtro de la columna actual
                    if f.get('columna') != columna:
                        filtros_validos.append(f)
                else:
                    logger.warning(f"Filtro inválido ignorado: {f}")
            
            if filtros_validos:
                queryset = self._aplicar_filtros(queryset, filtros_validos)
        
        # Obtener valores únicos de la columna después de aplicar filtros
        valores = queryset.values_list(columna, flat=True).distinct().order_by(columna)
        
        return Response({
            'columna': columna,
            'valores': list(valores),
            'total': len(valores),
            'filtros_aplicados': len(filtros) if filtros else 0
        })

