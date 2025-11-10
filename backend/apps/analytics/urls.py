"""
URLs para analytics
"""
from django.urls import path
from .views import (
    AnalisisDesercionView,
    AnalisisRendimientoView,
    AnalisisApoyosView,
    CorrelacionesView
)

urlpatterns = [
    path('desercion/', AnalisisDesercionView.as_view(), name='analisis-desercion'),
    path('rendimiento/', AnalisisRendimientoView.as_view(), name='analisis-rendimiento'),
    path('apoyos/', AnalisisApoyosView.as_view(), name='analisis-apoyos'),
    path('correlaciones/', CorrelacionesView.as_view(), name='correlaciones'),
]

