"""
Serializers para la aplicación data_manager
"""
from rest_framework import serializers
from .models import FuenteDatos, DatosEstudiante, EsquemaDatos


class FuenteDatosSerializer(serializers.ModelSerializer):
    """
    Serializer para cargar archivos de datos
    """
    class Meta:
        model = FuenteDatos
        fields = ['id', 'archivo', 'fecha_carga', 'procesado', 'fecha_procesamiento', 
                  'num_registros', 'num_columnas', 'mensaje_error']
        read_only_fields = ['fecha_carga', 'procesado', 'fecha_procesamiento', 
                           'num_registros', 'num_columnas', 'mensaje_error']


class DatosEstudianteSerializer(serializers.ModelSerializer):
    """
    Serializer completo para datos de estudiante
    """
    class Meta:
        model = DatosEstudiante
        exclude = ['fecha_creacion', 'fecha_actualizacion']


class EsquemaDatosSerializer(serializers.ModelSerializer):
    """
    Serializer para esquema de datos (metadatos de columnas)
    """
    class Meta:
        model = EsquemaDatos
        fields = '__all__'


class ConsultaDinamicaSerializer(serializers.Serializer):
    """
    Serializer para validar consultas dinámicas desde el frontend
    """
    dimensiones = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Lista de columnas para agrupar (ej: ['facultad', 'programa'])"
    )
    
    metricas = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Lista de métricas a calcular (ej: ['AVG(promedio_carrera)', 'COUNT(id)'])"
    )
    
    filtros = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="Lista de filtros a aplicar"
    )
    
    orden = serializers.CharField(
        required=False,
        help_text="Campo por el cual ordenar resultados"
    )
    
    limite = serializers.IntegerField(
        required=False,
        default=1000,
        help_text="Límite de registros a retornar"
    )
    
    def validate_filtros(self, value):
        """
        Validar estructura de filtros
        Cada filtro debe tener: columna, operador, valor
        """
        operadores_validos = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'icontains']
        
        for filtro in value:
            if 'columna' not in filtro:
                raise serializers.ValidationError("Cada filtro debe tener 'columna'")
            if 'operador' not in filtro:
                raise serializers.ValidationError("Cada filtro debe tener 'operador'")
            if 'valor' not in filtro:
                raise serializers.ValidationError("Cada filtro debe tener 'valor'")
            
            if filtro['operador'] not in operadores_validos:
                raise serializers.ValidationError(
                    f"Operador '{filtro['operador']}' no válido. "
                    f"Operadores válidos: {', '.join(operadores_validos)}"
                )
        
        return value
    
    def validate_metricas(self, value):
        """
        Validar que las métricas sean válidas
        """
        metricas_validas = ['AVG', 'SUM', 'COUNT', 'MIN', 'MAX']
        
        for metrica in value:
            metrica_upper = metrica.upper()
            if not any(m in metrica_upper for m in metricas_validas):
                raise serializers.ValidationError(
                    f"Métrica '{metrica}' no válida. "
                    f"Métricas válidas: {', '.join(metricas_validas)}"
                )
        
        return value

