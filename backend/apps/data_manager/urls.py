"""
URLs para la aplicación data_manager
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FuenteDatosViewSet, EsquemaDatosViewSet, DatosEstudianteViewSet

router = DefaultRouter()
router.register(r'fuentes', FuenteDatosViewSet, basename='fuentes')
router.register(r'schema', EsquemaDatosViewSet, basename='schema')
router.register(r'estudiantes', DatosEstudianteViewSet, basename='estudiantes')

urlpatterns = [
    path('', include(router.urls)),
]

