import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { Estadisticas } from '@core/models/estudiante.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit {
  estadisticas: Estadisticas | null = null;
  analisisDesercion: any = null;
  analisisRendimiento: any = null;
  cargando: boolean = true;

  // Gráficos
  graficoDesercion: any[] = [];
  layoutDesercion: any = {};
  datosOriginalesDesercion: any[] = [];
  
  graficoFacultad: any[] = [];
  layoutFacultad: any = {};
  datosOriginalesFacultad: any[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;

    // Cargar estadísticas generales
    this.apiService.getEstadisticas().subscribe({
      next: (stats) => {
        this.estadisticas = stats;
        this.generarGraficoDesercion();
      },
      error: (error) => console.error('Error al cargar estadísticas:', error)
    });

    // Cargar análisis de deserción
    this.apiService.getAnalisisDesercion().subscribe({
      next: (analisis) => {
        this.analisisDesercion = analisis;
        this.generarGraficoFacultad(analisis.desercion_por_facultad);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar análisis de deserción:', error);
        this.cargando = false;
      }
    });

    // Cargar análisis de rendimiento
    this.apiService.getAnalisisRendimiento().subscribe({
      next: (analisis) => {
        this.analisisRendimiento = analisis;
      },
      error: (error) => console.error('Error al cargar análisis de rendimiento:', error)
    });
  }

  generarGraficoDesercion(): void {
    if (!this.estadisticas) return;

    const trace = {
      values: [this.estadisticas.desertores, this.estadisticas.no_desertores],
      labels: ['Desertores', 'No Desertores'],
      type: 'pie',
      marker: {
        colors: ['#ff6b6b', '#51cf66']
      },
      textinfo: 'label+percent',
      textposition: 'inside'
    };

    this.graficoDesercion = [trace];
    
    // Preparar datos originales para tabla/CSV
    this.datosOriginalesDesercion = [
      { categoria: 'Desertores', cantidad: this.estadisticas.desertores },
      { categoria: 'No Desertores', cantidad: this.estadisticas.no_desertores }
    ];
    
    this.layoutDesercion = {
      title: 'Distribución de Deserción',
      height: 400,
      showlegend: true,
      xaxis: {
        type: 'category' // Forzar tipo categórico
      }
    };
  }

  generarGraficoFacultad(datos: any[]): void {
    if (!datos || datos.length === 0) return;

    const facultades = datos.map(d => d.facultad);
    const desertores = datos.map(d => d.desertores);
    const noDesertores = datos.map(d => d.no_desertores);

    // Calcular rotación del eje X basada en longitud de etiquetas
    const tieneEtiquetasLargas = facultades.some(f => f && f.length > 5);
    const tickangleX = tieneEtiquetasLargas ? -90 : 0;

    // Ajustar márgenes cuando hay rotación
    const margin = tieneEtiquetasLargas 
      ? { t: 50, r: 50, b: 120, l: 60 }
      : { t: 50, r: 50, b: 50, l: 60 };

    const trace1 = {
      x: facultades,
      y: desertores,
      name: 'Desertores',
      type: 'bar',
      marker: { color: '#ff6b6b' }
    };

    const trace2 = {
      x: facultades,
      y: noDesertores,
      name: 'No Desertores',
      type: 'bar',
      marker: { color: '#51cf66' }
    };

    this.graficoFacultad = [trace1, trace2];
    
    // Preparar datos originales para tabla/CSV
    this.datosOriginalesFacultad = datos.map(d => ({
      facultad: d.facultad,
      desertores: d.desertores,
      no_desertores: d.no_desertores,
      total: d.desertores + d.no_desertores
    }));
    
    this.layoutFacultad = {
      title: 'Deserción por Facultad',
      margin: margin,
      barmode: 'group',
      xaxis: { 
        title: 'Facultad',
        tickangle: tickangleX,
        automargin: true,
        type: 'category' // Forzar tipo categórico
      },
      yaxis: { 
        title: 'Cantidad de Estudiantes',
        automargin: true
      },
      height: 500
    };
  }

  get tasaDesercion(): string {
    return this.estadisticas 
      ? `${this.estadisticas.porcentaje_desercion.toFixed(2)}%`
      : '0%';
  }
}

