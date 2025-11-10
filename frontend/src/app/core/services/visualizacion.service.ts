/**
 * Servicio para gestionar la lógica de visualizaciones y gráficos
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  ConfiguracionGrafico,
  TipoGrafico,
  VariableSeleccionada,
  DragDropVariable
} from '@core/models/visualizacion.model';
import { Filtro } from '@core/models/estudiante.model';

export interface EstadoVisualizacion {
  configuracion: ConfiguracionGrafico;
  variablesSeleccionadas: {
    ejeX: DragDropVariable[];
    ejeY: DragDropVariable[];
    color?: DragDropVariable[];
    size?: DragDropVariable[];
  };
  filtrosActivos: Filtro[];
  datosActuales: any[];
}

@Injectable({
  providedIn: 'root'
})
export class VisualizacionService {
  
  // Estado global de la visualización actual
  private estadoSubject = new BehaviorSubject<EstadoVisualizacion>({
    configuracion: {
      tipo: 'bar',
      titulo: 'Nuevo Gráfico',
      mostrarLeyenda: true,
      alto: 500
    },
    variablesSeleccionadas: {
      ejeX: [],
      ejeY: []
    },
    filtrosActivos: [],
    datosActuales: []
  });
  
  public estado$ = this.estadoSubject.asObservable();

  constructor() {}

  /**
   * Obtener el estado actual
   */
  getEstado(): EstadoVisualizacion {
    return this.estadoSubject.value;
  }

  /**
   * Actualizar la configuración del gráfico
   */
  actualizarConfiguracion(config: Partial<ConfiguracionGrafico>): void {
    const estadoActual = this.estadoSubject.value;
    this.estadoSubject.next({
      ...estadoActual,
      configuracion: {
        ...estadoActual.configuracion,
        ...config
      }
    });
  }

  /**
   * Cambiar el tipo de gráfico
   */
  cambiarTipoGrafico(tipo: TipoGrafico): void {
    this.actualizarConfiguracion({ tipo });
  }

  /**
   * Agregar variable a un eje
   */
  agregarVariable(eje: 'ejeX' | 'ejeY' | 'color' | 'size', variable: DragDropVariable): void {
    const estadoActual = this.estadoSubject.value;
    const variablesActuales = estadoActual.variablesSeleccionadas[eje] || [];
    
    // Si el eje solo permite una variable, reemplazar
    if (eje === 'ejeX' || eje === 'ejeY') {
      this.estadoSubject.next({
        ...estadoActual,
        variablesSeleccionadas: {
          ...estadoActual.variablesSeleccionadas,
          [eje]: [variable]
        }
      });
    } else {
      // Para color y size, permitir múltiples
      this.estadoSubject.next({
        ...estadoActual,
        variablesSeleccionadas: {
          ...estadoActual.variablesSeleccionadas,
          [eje]: [...variablesActuales, variable]
        }
      });
    }
  }

  /**
   * Remover variable de un eje
   */
  removerVariable(eje: 'ejeX' | 'ejeY' | 'color' | 'size', nombreVariable: string): void {
    const estadoActual = this.estadoSubject.value;
    const variablesActuales = estadoActual.variablesSeleccionadas[eje] || [];
    
    this.estadoSubject.next({
      ...estadoActual,
      variablesSeleccionadas: {
        ...estadoActual.variablesSeleccionadas,
        [eje]: variablesActuales.filter(v => v.nombre !== nombreVariable)
      }
    });
  }

  /**
   * Agregar filtro
   */
  agregarFiltro(filtro: Filtro): void {
    const estadoActual = this.estadoSubject.value;
    
    // Verificar si ya existe un filtro para esta columna
    const filtrosActualizados = estadoActual.filtrosActivos.filter(
      f => f.columna !== filtro.columna
    );
    filtrosActualizados.push(filtro);
    
    this.estadoSubject.next({
      ...estadoActual,
      filtrosActivos: filtrosActualizados
    });
  }

  /**
   * Remover filtro
   */
  removerFiltro(columna: string): void {
    const estadoActual = this.estadoSubject.value;
    
    this.estadoSubject.next({
      ...estadoActual,
      filtrosActivos: estadoActual.filtrosActivos.filter(f => f.columna !== columna)
    });
  }

  /**
   * Limpiar todos los filtros
   */
  limpiarFiltros(): void {
    const estadoActual = this.estadoSubject.value;
    
    this.estadoSubject.next({
      ...estadoActual,
      filtrosActivos: []
    });
  }

  /**
   * Actualizar datos actuales
   */
  actualizarDatos(datos: any[]): void {
    const estadoActual = this.estadoSubject.value;
    
    this.estadoSubject.next({
      ...estadoActual,
      datosActuales: datos
    });
  }

  /**
   * Resetear estado a valores por defecto
   */
  resetear(): void {
    this.estadoSubject.next({
      configuracion: {
        tipo: 'bar',
        titulo: 'Nuevo Gráfico',
        mostrarLeyenda: true,
        alto: 500
      },
      variablesSeleccionadas: {
        ejeX: [],
        ejeY: []
      },
      filtrosActivos: [],
      datosActuales: []
    });
  }

  /**
   * Generar configuración de Plotly basada en el estado actual
   */
  generarConfigPlotly(): any {
    const estado = this.estadoSubject.value;
    const { configuracion, variablesSeleccionadas, datosActuales } = estado;

    if (!datosActuales || datosActuales.length === 0) {
      return null;
    }

    const ejeX = variablesSeleccionadas.ejeX[0]?.nombre;
    const ejeY = variablesSeleccionadas.ejeY[0]?.nombre;

    if (!ejeX || !ejeY) {
      return null;
    }

    // Extraer datos
    const xData = datosActuales.map(d => d[ejeX]);
    const yData = datosActuales.map(d => d[ejeY]);

    // Configuración base del trace
    const trace: any = {
      x: xData,
      y: yData,
      type: this.mapearTipoGrafico(configuracion.tipo),
      name: configuracion.titulo
    };

    // Agregar color si está definido
    if (variablesSeleccionadas.color && variablesSeleccionadas.color.length > 0) {
      const colorVar = variablesSeleccionadas.color[0].nombre;
      trace.marker = {
        color: datosActuales.map(d => d[colorVar])
      };
    }

    // Layout del gráfico
    const layout: any = {
      title: configuracion.titulo,
      xaxis: { title: ejeX },
      yaxis: { title: ejeY },
      showlegend: configuracion.mostrarLeyenda,
      height: configuracion.alto || 500
    };

    return {
      data: [trace],
      layout: layout,
      config: { responsive: true, displayModeBar: true }
    };
  }

  /**
   * Mapear tipos de gráfico internos a tipos de Plotly
   */
  private mapearTipoGrafico(tipo: TipoGrafico): string {
    const mapeo: { [key in TipoGrafico]: string } = {
      'bar': 'bar',
      'line': 'scatter',
      'scatter': 'scatter',
      'pie': 'pie',
      'area': 'scatter',
      'box': 'box',
      'histogram': 'histogram',
      'heatmap': 'heatmap'
    };
    return mapeo[tipo] || 'bar';
  }
}

