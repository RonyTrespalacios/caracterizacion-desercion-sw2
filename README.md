# Sistema de Análisis y Visualización de Trayectoria Estudiantil

## Universidad de los Llanos

![Status](https://img.shields.io/badge/status-development-yellow)
![Django](https://img.shields.io/badge/Django-5.0-green)
![Angular](https://img.shields.io/badge/Angular-19-red)
![Python](https://img.shields.io/badge/Python-3.11-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)

## 📋 Descripción

Plataforma web interactiva para el análisis y visualización de datos académicos de estudiantes de la Universidad de los Llanos. El sistema permite a investigadores y académicos explorar datos de trayectoria estudiantil mediante visualizaciones dinámicas y filtros interactivos, con especial enfoque en el análisis de deserción académica.

### Características Principales

✨ **Explorador de Datos Interactivo** - Interfaz tipo Plotly con drag & drop de variables
📊 **Visualizaciones Dinámicas** - Múltiples tipos de gráficos (barras, líneas, dispersión, etc.)
🔍 **Filtros Avanzados** - Sistema de filtros dinámicos para análisis específicos
🔒 **Seguridad y Privacidad** - Sanitización automática de datos sensibles (Ley 1581 de 2012)
📈 **Dashboard de Estadísticas** - Visualización de métricas clave de deserción
🎯 **Análisis de Deserción** - Herramientas específicas para estudiar factores de deserción
🐳 **Dockerizado** - Fácil despliegue con Docker Compose

## 🏗️ Arquitectura

El sistema implementa una arquitectura de 3 niveles (3-Tier) completamente desacoplada:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Frontend      │      │    Backend      │      │   Base de       │
│   Angular 19    │◄────►│   Django REST   │◄────►│   Datos         │
│   (Nginx)       │      │   Framework     │      │   PostgreSQL    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
     Puerto 4200              Puerto 8000              Puerto 5432
```

### Componentes

- **Frontend**: Angular 19 + Angular Material + Plotly.js (lazy load)
- **Backend**: Django 5.0 + Django REST Framework + Pandas
- **Base de Datos**: PostgreSQL 15
- **Cache/Queue**: Redis 7 (para Celery)
- **Servidor Web**: Nginx (producción)

## 📊 Datos

El sistema analiza **12,692 registros** de estudiantes con **89 variables**, incluyendo:

- Información académica (programa, facultad, periodo de ingreso)
- Rendimiento académico (promedios, créditos, materias reprobadas)
- Datos demográficos (sexo, edad, estrato, grupo étnico)
- Apoyos financieros (ICETEX, gratuidad, becas)
- Datos geográficos (ciudad y departamento de residencia)

### Variable de Interés Principal

**DESERTOR** (0: No desertor | 1: Desertor)
- Tasa de deserción: **40.08%**

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose (recomendado)
- O manualmente: Python 3.11+, Node.js 18+, PostgreSQL 15+

### Opción 1: Con Docker (Recomendado)

```bash
# Clonar el repositorio
cd "SOFTWARE 2"

# Construir y levantar (compose v2)
docker compose -f docker-compose.dev.yml up -d --build

# Ver estado
docker compose -f docker-compose.dev.yml ps

# Accesos
# Frontend: http://localhost:4200
# Backend API: http://localhost:8000
# Admin Django: http://localhost:8000/admin
```

Crear usuario admin de ejemplo (admin/admin123):

- Windows (PowerShell):
```powershell
docker compose -f docker-compose.dev.yml exec backend python manage.py shell -c 'from django.contrib.auth import get_user_model; U=get_user_model(); u=U.objects.filter(username="admin").first() or U.objects.create_superuser("admin","admin@localhost","admin123"); print("Usuario listo:", u.username)'
```

- Linux/macOS (bash/zsh):
```bash
docker compose -f docker-compose.dev.yml exec backend python manage.py shell -c "from django.contrib.auth import get_user_model; U=get_user_model(); u=U.objects.filter(username='admin').first() or U.objects.create_superuser('admin','admin@localhost','admin123'); print('Usuario listo:', u.username)"
```

### Opción 2: Desarrollo Manual

#### Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar base de datos PostgreSQL
# Editar config/settings.py con tus credenciales

# Migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Ejecutar servidor
python manage.py runserver
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Acceder a http://localhost:4200
```

## 📁 Estructura del Proyecto

```
SOFTWARE 2/
├── backend/                    # Backend Django
│   ├── apps/
│   │   ├── data_manager/      # Gestión de datos y ETL
│   │   └── analytics/         # Análisis estadísticos
│   ├── config/                # Configuración Django
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                   # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Servicios y modelos
│   │   │   ├── shared/        # Componentes compartidos
│   │   │   └── features/      # Módulos de features
│   │   │       ├── dashboard/ # Dashboard principal
│   │   │       └── data-explorer/  # Explorador interactivo
│   │   └── environments/
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
│
├── db/                         # Base de datos
│   └── datos_consolidados.xlsx
│
├── docker-compose.yml          # Orquestación completa (prod)
├── docker-compose.dev.yml      # Orquestación de desarrollo
├── Arquitectura.txt            # Documentación de arquitectura
└── README.md                   # Este archivo
```

## 🔑 Funcionalidades Principales

### 1. Dashboard de Estadísticas

Vista general con métricas clave:
- Total de estudiantes
- Cantidad de desertores y no desertores
- Tasa de deserción
- Distribución por facultades y programas
- Gráficos predefinidos

### 2. Explorador de Datos

Herramienta interactiva tipo Plotly:
- **Drag & Drop** de variables a ejes X, Y y Color
- **Selector de tipo de gráfico** (8 tipos disponibles)
- **Filtros dinámicos** con múltiples operadores
- **Consultas en tiempo real** a la API
- **Exportación** de gráficos (PNG, SVG, PDF)
 - Control flow Angular 19 en plantillas (`@if`, `@for`)

### 3. Proceso ETL

Sistema automático de carga de datos:
- Carga de archivos Excel (.xlsx) o CSV
- **Sanitización automática** de datos sensibles (nombres, códigos)
- Transformación y limpieza de datos
- Actualización del esquema de metadatos
- Validación de integridad

### 4. API RESTful

Endpoints principales:

```
GET  /api/v1/data/schema/resumen/          # Esquema de datos
GET  /api/v1/data/estudiantes/estadisticas/  # Estadísticas generales
POST /api/v1/data/estudiantes/consulta_dinamica/  # Consulta personalizada
GET  /api/v1/analytics/desercion/          # Análisis de deserción
GET  /api/v1/analytics/rendimiento/        # Análisis de rendimiento
```

## 🔐 Seguridad

El sistema implementa las siguientes medidas de seguridad:

1. **Sanitización de datos sensibles**: Eliminación automática de:
   - CODIGO_INST
   - NOMBRE1, NOMBRE2
   - APELLIDO1, APELLIDO2

2. **Prevención de Inyección SQL**: Todas las consultas usan el ORM de Django

3. **CORS configurado**: Control de orígenes permitidos

4. **Autenticación para Admin**: Portal de administración protegido

## 📈 Análisis Disponibles

### Análisis de Deserción
- Por facultad y programa
- Por periodo de ingreso
- Por género y estrato socioeconómico
- Por tipo de colegio
- Por grupo étnico

### Análisis de Rendimiento
- Promedio académico por facultad
- Correlación entre promedio y deserción
- Análisis de materias reprobadas
- Distribución de créditos aprobados

### Análisis de Apoyos
- Beneficiarios por tipo de apoyo (ICETEX, gratuidad, etc.)
- Impacto de apoyos en deserción
- Distribución de ayudas por facultad

## 🛠️ Tecnologías Utilizadas

### Backend
- **Django 5.0**: Framework web
- **Django REST Framework**: API RESTful
- **Pandas**: Procesamiento de datos (ETL)
- **PostgreSQL**: Base de datos relacional
- **Gunicorn**: Servidor WSGI
- **Celery + Redis**: Tareas asíncronas

### Frontend
- **Angular 19**: Framework SPA (control flow `@if`/`@for` y Signals preparados)
- **Angular Material**: Componentes UI
- **Plotly.js**: Visualizaciones interactivas (carga diferida para reducir bundle)
- **RxJS**: Programación reactiva
- **TypeScript**: Tipado estático

### DevOps
- **Docker & Docker Compose**: Containerización
- **Nginx**: Servidor web y proxy reverso

## 📝 Uso del Sistema

### Cargar Datos (Administrador)

1. Acceder al admin de Django: `http://localhost:8000/admin`
2. Ir a "Fuentes de Datos"
3. Cargar archivo Excel (.xlsx)
4. El sistema procesa automáticamente el archivo (ETL)

### Explorar Datos (Usuario)

1. Acceder al explorador: `http://localhost:4200/explorador`
2. Arrastrar variables desde el panel izquierdo a las zonas de drop (Eje X, Eje Y)
3. Seleccionar tipo de gráfico deseado
4. Aplicar filtros si es necesario
5. Generar visualización

## 🧪 Testing

```bash
# Backend
cd backend
python manage.py test

# Frontend
cd frontend
npm test
```

## 📦 Despliegue en Producción

### Configuración

1. Cambiar `DEBUG=False` en settings.py
2. Configurar `SECRET_KEY` segura
3. Actualizar `ALLOWED_HOSTS`
4. Configurar variables de entorno en `.env`
5. Configurar dominio en `CORS_ALLOWED_ORIGINS`

### Comandos (compose v2)

```bash
# Build de producción (ejemplo)
docker compose -f docker-compose.yml up -d --build

# Migraciones
docker compose -f docker-compose.dev.yml exec backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.dev.yml exec backend python manage.py collectstatic --noinput
```

## 🤝 Contribuciones

Este proyecto es parte de una investigación académica de la Universidad de los Llanos.

## 📄 Licencia

Este proyecto es de uso académico e investigativo para la Universidad de los Llanos.

## 👥 Autores

- **Equipo de Investigación** - Universidad de los Llanos
- **Proyecto**: Software Joven INV

## 📞 Contacto

Para más información sobre el proyecto, contactar a través de la Universidad de los Llanos.

## 📚 Documentación Adicional

- [Arquitectura del Sistema](./Arquitectura.txt)
- [Ideas y Requerimientos](./Ideas%20generales.txt)
- [Guía de Docker](./DOCKER.md)

---

**Universidad de los Llanos** - Sistema de Análisis de Trayectoria Estudiantil

