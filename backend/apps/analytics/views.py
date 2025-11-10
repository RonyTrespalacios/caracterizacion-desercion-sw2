"""
Views para análisis estadísticos avanzados
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Avg, Q
from apps.data_manager.models import DatosEstudiante
import logging

logger = logging.getLogger(__name__)


class AnalisisDesercionView(APIView):
    """
    Análisis específico de deserción
    Endpoint: GET /api/v1/analytics/desercion/
    """
    
    def get(self, request):
        """
        Obtener análisis de deserción por diferentes dimensiones
        """
        try:
            # Análisis por facultad
            desercion_facultad = DatosEstudiante.objects.values('facultad').annotate(
                total=Count('id'),
                desertores=Count('id', filter=Q(desertor=1)),
                no_desertores=Count('id', filter=Q(desertor=0)),
                promedio_carrera=Avg('promedio_carrera'),
                promedio_creditos_reprobados=Avg('creditos_reprobados')
            ).order_by('-desertores')
            
            # Análisis por programa (top 10)
            desercion_programa = DatosEstudiante.objects.values('programa', 'facultad').annotate(
                total=Count('id'),
                desertores=Count('id', filter=Q(desertor=1)),
                no_desertores=Count('id', filter=Q(desertor=0)),
                tasa_desercion=Count('id', filter=Q(desertor=1)) * 100.0 / Count('id')
            ).order_by('-desertores')[:10]
            
            # Análisis por periodo de ingreso
            desercion_periodo = DatosEstudiante.objects.values('periodo_ingreso').annotate(
                total=Count('id'),
                desertores=Count('id', filter=Q(desertor=1)),
                no_desertores=Count('id', filter=Q(desertor=0))
            ).order_by('periodo_ingreso')
            
            # Análisis por género
            desercion_genero = DatosEstudiante.objects.values('sexo').annotate(
                total=Count('id'),
                desertores=Count('id', filter=Q(desertor=1)),
                no_desertores=Count('id', filter=Q(desertor=0))
            )
            
            # Análisis por estrato
            desercion_estrato = DatosEstudiante.objects.values('estrato').annotate(
                total=Count('id'),
                desertores=Count('id', filter=Q(desertor=1)),
                no_desertores=Count('id', filter=Q(desertor=0))
            ).order_by('estrato')
            
            return Response({
                'desercion_por_facultad': list(desercion_facultad),
                'desercion_por_programa': list(desercion_programa),
                'desercion_por_periodo': list(desercion_periodo),
                'desercion_por_genero': list(desercion_genero),
                'desercion_por_estrato': list(desercion_estrato),
            })
            
        except Exception as e:
            logger.error(f"Error en análisis de deserción: {str(e)}")
            return Response(
                {'error': 'Error al generar análisis de deserción'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalisisRendimientoView(APIView):
    """
    Análisis de rendimiento académico
    Endpoint: GET /api/v1/analytics/rendimiento/
    """
    
    def get(self, request):
        """
        Obtener análisis de rendimiento académico
        """
        try:
            # Promedio general por facultad
            rendimiento_facultad = DatosEstudiante.objects.values('facultad').annotate(
                promedio_general=Avg('promedio_carrera'),
                promedio_primer_semestre=Avg('promedio_primer_semestre'),
                creditos_aprobados_avg=Avg('creditos_aprobados_porcentaje'),
                creditos_reprobados_avg=Avg('creditos_reprobados')
            ).order_by('-promedio_general')
            
            # Comparación desertor vs no desertor
            rendimiento_desercion = DatosEstudiante.objects.values('desertor').annotate(
                promedio_carrera=Avg('promedio_carrera'),
                promedio_primer_semestre=Avg('promedio_primer_semestre'),
                creditos_reprobados=Avg('creditos_reprobados'),
                materias_reprobadas=Avg('cantidad_materias_reprobadas')
            )
            
            return Response({
                'rendimiento_por_facultad': list(rendimiento_facultad),
                'rendimiento_por_desercion': list(rendimiento_desercion),
            })
            
        except Exception as e:
            logger.error(f"Error en análisis de rendimiento: {str(e)}")
            return Response(
                {'error': 'Error al generar análisis de rendimiento'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalisisApoyosView(APIView):
    """
    Análisis de apoyos financieros
    Endpoint: GET /api/v1/analytics/apoyos/
    """
    
    def get(self, request):
        """
        Obtener análisis de apoyos financieros y su impacto
        """
        try:
            # Contar estudiantes con cada tipo de apoyo
            total_estudiantes = DatosEstudiante.objects.count()
            
            apoyos = {
                'icetex': DatosEstudiante.objects.filter(credito_icetex='SI').count(),
                'gratuidad': DatosEstudiante.objects.filter(politica_gratuidad='SI').count(),
                'excelencia': DatosEstudiante.objects.filter(descuento_excelencia='SI').count(),
                'electoral': DatosEstudiante.objects.filter(descuento_electoral='SI').count(),
            }
            
            # Deserción con/sin apoyos
            desercion_icetex = {
                'con_icetex': DatosEstudiante.objects.filter(
                    credito_icetex='SI', desertor=1
                ).count(),
                'sin_icetex': DatosEstudiante.objects.filter(
                    credito_icetex='NO', desertor=1
                ).count(),
            }
            
            desercion_gratuidad = {
                'con_gratuidad': DatosEstudiante.objects.filter(
                    politica_gratuidad='SI', desertor=1
                ).count(),
                'sin_gratuidad': DatosEstudiante.objects.filter(
                    politica_gratuidad='NO', desertor=1
                ).count(),
            }
            
            return Response({
                'total_estudiantes': total_estudiantes,
                'apoyos_por_tipo': apoyos,
                'desercion_icetex': desercion_icetex,
                'desercion_gratuidad': desercion_gratuidad,
            })
            
        except Exception as e:
            logger.error(f"Error en análisis de apoyos: {str(e)}")
            return Response(
                {'error': 'Error al generar análisis de apoyos'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CorrelacionesView(APIView):
    """
    Análisis de correlaciones entre variables
    Endpoint: GET /api/v1/analytics/correlaciones/
    """
    
    def get(self, request):
        """
        Calcular correlaciones importantes para deserción
        """
        try:
            # Aquí se pueden agregar análisis más sofisticados
            # Por ahora, retornamos algunas estadísticas descriptivas
            
            # Deserción por rangos de promedio
            rangos_promedio = [
                {
                    'rango': '0-2.5',
                    'desertores': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=0, promedio_carrera__lt=2.5, desertor=1
                    ).count(),
                    'total': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=0, promedio_carrera__lt=2.5
                    ).count(),
                },
                {
                    'rango': '2.5-3.5',
                    'desertores': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=2.5, promedio_carrera__lt=3.5, desertor=1
                    ).count(),
                    'total': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=2.5, promedio_carrera__lt=3.5
                    ).count(),
                },
                {
                    'rango': '3.5-4.5',
                    'desertores': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=3.5, promedio_carrera__lt=4.5, desertor=1
                    ).count(),
                    'total': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=3.5, promedio_carrera__lt=4.5
                    ).count(),
                },
                {
                    'rango': '4.5-5.0',
                    'desertores': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=4.5, promedio_carrera__lte=5.0, desertor=1
                    ).count(),
                    'total': DatosEstudiante.objects.filter(
                        promedio_carrera__gte=4.5, promedio_carrera__lte=5.0
                    ).count(),
                },
            ]
            
            return Response({
                'desercion_por_promedio': rangos_promedio,
            })
            
        except Exception as e:
            logger.error(f"Error en análisis de correlaciones: {str(e)}")
            return Response(
                {'error': 'Error al generar análisis de correlaciones'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

