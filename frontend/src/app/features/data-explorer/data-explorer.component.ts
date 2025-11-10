import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '@core/services/api.service';
import { VisualizacionService } from '@core/services/visualizacion.service';
import { 
  DragDropVariable, 
  TipoGrafico, 
  TIPOS_GRAFICOS,
  TipoMetrica,
  TIPOS_METRICAS
} from '@core/models/visualizacion.model';
import {
  EsquemaColumna,
  Filtro,
  ConsultaDinamica
} from '@core/models/estudiante.model';

@Component({
  selector: 'app-data-explorer',
  templateUrl: './data-explorer.component.html',
  styleUrls: ['./data-explorer.component.scss'],
  standalone: false
})
export class DataExplorerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Variables disponibles
  variablesDisponibles: DragDropVariable[] = [];
  columnas: EsquemaColumna[] = [];
  
  // Variables en los ejes
  variablesEjeX: DragDropVariable[] = [];
  variablesEjeY: DragDropVariable[] = [];
  variablesColor: DragDropVariable[] = [];
  
  // Filtros
  filtrosActivos: Filtro[] = [];
  
  // Configuración del gráfico
  tipoGraficoSeleccionado: TipoGrafico = 'bar';
  tiposGraficos = TIPOS_GRAFICOS;
  tiposMetricas = TIPOS_METRICAS;
  tituloGrafico: string = 'Análisis de Trayectoria Estudiantil';
  
  // Métricas disponibles según la variable seleccionada
  get metricasDisponibles() {
    if (this.variablesEjeY.length > 0) {
      const variable = this.variablesEjeY[0];
      // Si es "desertor", incluir PERCENTAGE
      if (variable.nombre.toLowerCase() === 'desertor') {
        return TIPOS_METRICAS;
      }
      // Para otras variables, excluir PERCENTAGE
      return TIPOS_METRICAS.filter(m => m.value !== 'PERCENTAGE');
    }
    return TIPOS_METRICAS.filter(m => m.value !== 'PERCENTAGE');
  }
  
  // Datos y visualización
  datosGrafico: any[] = [];
  datosOriginales: any[] = []; // Datos crudos para tabla/CSV
  layoutGrafico: any = {};
  configGrafico: any = {};
  cargando: boolean = false;
  
  constructor(
    private apiService: ApiService,
    private visualizacionService: VisualizacionService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarEsquemaDatos();
    
    // Suscribirse al estado de visualización
    this.visualizacionService.estado$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300)
      )
      .subscribe(estado => {
        this.actualizarVisualizacion();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar el esquema de datos desde la API
   */
  cargarEsquemaDatos(): void {
    this.cargando = true;
    
    this.apiService.getEsquemaDatos().subscribe({
      next: (esquema) => {
        this.columnas = esquema.columnas;
        
        // Convertir columnas a variables
        // Variables numéricas con < 20 valores únicos se tratan como categóricas para color
        this.variablesDisponibles = esquema.columnas
          .filter(col => col.visualizable)
          .map(col => {
            const cantidadValores = col.cantidad_valores_unicos ?? 0;
            const esNumericoCategoricoParaColor = 
              col.tipo === 'numerico' && 
              cantidadValores > 0 && 
              cantidadValores < 20;
            
            return {
              nombre: col.nombre,
              tipo: col.tipo as 'numerico' | 'categorico',
              descripcion: col.descripcion,
              cantidadValoresUnicos: cantidadValores,
              // Flag para saber si puede usarse como color aunque sea numérica
              puedeSerColor: col.tipo === 'categorico' || esNumericoCategoricoParaColor
            };
          });
        
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar esquema:', error);
        this.cargando = false;
      }
    });
  }

  /**
   * Cuando se agrega una variable al eje X
   */
  onVariableAgregadaX(variable: DragDropVariable): void {
    console.log('Agregando a Eje X:', variable);
    // Reemplazar si ya hay una
    this.variablesEjeX = [variable];
    this.visualizacionService.agregarVariable('ejeX', variable);
    
    // Notificación
    this.snackBar.open(`✓ "${variable.nombre}" agregada al Eje X`, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'left',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success']
    });
    
    // Generar gráfico automáticamente si hay X e Y
    this.generarGraficoAutomatico();
  }

  /**
   * Cuando se remueve una variable del eje X
   */
  onVariableRemovidaX(variable: DragDropVariable): void {
    console.log('Removiendo de Eje X:', variable);
    this.variablesEjeX = [];
    this.visualizacionService.removerVariable('ejeX', variable.nombre);
    this.datosGrafico = [];
    
    // Si no hay datos, limpiar gráfico
    this.generarGraficoAutomatico();
  }

  /**
   * Cuando se agrega una variable al eje Y
   */
  onVariableAgregadaY(variable: DragDropVariable): void {
    console.log('Agregando a Eje Y:', variable);
    // Validar que sea numérica
    if (variable.tipo !== 'numerico') {
      console.warn('Eje Y solo acepta variables numéricas');
      this.snackBar.open('⚠ Eje Y solo acepta variables numéricas', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-warning']
      });
      return;
    }
    
    // Si no tiene métrica, asignar AVG por defecto
    const variableConMetrica: DragDropVariable = {
      ...variable,
      metrica: variable.metrica || 'AVG'
    };
    
    this.variablesEjeY = [variableConMetrica];
    this.visualizacionService.agregarVariable('ejeY', variableConMetrica);
    
    // Notificación
    this.snackBar.open(`✓ "${variable.nombre}" agregada al Eje Y`, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'left',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success']
    });
    
    // Generar gráfico automáticamente si hay X e Y
    this.generarGraficoAutomatico();
  }

  /**
   * Cuando se remueve una variable del eje Y
   */
  onVariableRemovidaY(variable: DragDropVariable): void {
    console.log('Removiendo de Eje Y:', variable);
    this.variablesEjeY = [];
    this.visualizacionService.removerVariable('ejeY', variable.nombre);
    this.datosGrafico = [];
    
    // Si no hay datos, limpiar gráfico
    this.generarGraficoAutomatico();
  }

  /**
   * Cambiar métrica de una variable en el eje Y
   */
  onMetricaCambiada(metrica: TipoMetrica): void {
    if (this.variablesEjeY.length > 0) {
      this.variablesEjeY[0] = {
        ...this.variablesEjeY[0],
        metrica: metrica
      };
      console.log('Métrica cambiada a:', metrica, 'para variable:', this.variablesEjeY[0].nombre);
      
      // Actualizar gráfico con la nueva métrica
      this.generarGraficoAutomatico();
    }
  }

  /**
   * Cuando se agrega una variable para color
   */
  onVariableAgregadaColor(variable: DragDropVariable): void {
    console.log('Agregando a Color:', variable);
    // Validar que pueda ser color (categórica O numérica con pocos valores)
    if (!variable.puedeSerColor) {
      console.warn('Color solo acepta variables categóricas o numéricas con < 20 valores únicos');
      this.snackBar.open('⚠ Color solo acepta variables categóricas o con pocos valores únicos', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-warning']
      });
      return;
    }
    this.variablesColor = [variable];
    this.visualizacionService.agregarVariable('color', variable);
    
    // Notificación
    this.snackBar.open(`✓ "${variable.nombre}" agregada a Color`, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'left',
      verticalPosition: 'bottom',
      panelClass: ['snackbar-success']
    });
    
    // Actualizar gráfico con la nueva variable de color
    this.generarGraficoAutomatico();
  }

  /**
   * Cuando se remueve una variable de color
   */
  onVariableRemovidaColor(variable: DragDropVariable): void {
    console.log('Removiendo de Color:', variable);
    this.variablesColor = [];
    this.visualizacionService.removerVariable('color', variable.nombre);
    
    // Actualizar gráfico sin la variable de color
    this.generarGraficoAutomatico();
  }

  /**
   * Cambiar tipo de gráfico
   */
  onTipoGraficoChange(tipo: TipoGrafico | string): void {
    const tipoGrafico = typeof tipo === 'string' ? tipo as TipoGrafico : tipo;
    this.tipoGraficoSeleccionado = tipoGrafico;
    this.visualizacionService.cambiarTipoGrafico(tipoGrafico);
    
    // Regenerar gráfico con el nuevo tipo
    this.generarGraficoAutomatico();
  }

  /**
   * Agregar filtro
   */
  onFiltroAgregado(filtro: Filtro): void {
    this.filtrosActivos.push(filtro);
    this.visualizacionService.agregarFiltro(filtro);
    
    // Actualizar gráfico con el nuevo filtro
    this.generarGraficoAutomatico();
  }

  /**
   * Remover filtro
   */
  onFiltroRemovido(columna: string): void {
    this.filtrosActivos = this.filtrosActivos.filter(f => f.columna !== columna);
    this.visualizacionService.removerFiltro(columna);
    
    // Actualizar gráfico sin el filtro
    this.generarGraficoAutomatico();
  }

  /**
   * Limpiar todos los filtros
   */
  onFiltrosLimpiados(): void {
    this.filtrosActivos = [];
    this.visualizacionService.limpiarFiltros();
    
    // Actualizar gráfico sin filtros
    this.generarGraficoAutomatico();
  }

  /**
   * Genera el gráfico automáticamente si hay datos suficientes
   */
  generarGraficoAutomatico(): void {
    // Solo generar si hay variables en ambos ejes
    if (this.variablesEjeX.length > 0 && this.variablesEjeY.length > 0) {
      this.actualizarGrafico();
    } else {
      // Si no hay datos suficientes, limpiar el gráfico
      this.datosGrafico = [];
      console.log('No hay suficientes variables para generar gráfico');
    }
  }

  /**
   * Actualizar el gráfico realizando una consulta a la API
   */
  actualizarGrafico(): void {
    console.log('=== GENERAR GRÁFICO ===');
    console.log('Variables Eje X:', this.variablesEjeX);
    console.log('Variables Eje Y:', this.variablesEjeY);
    console.log('Tipo de gráfico:', this.tipoGraficoSeleccionado);
    
    // Validar que haya variables en ambos ejes
    if (this.variablesEjeX.length === 0 || this.variablesEjeY.length === 0) {
      console.warn('No hay variables en ambos ejes');
      this.datosGrafico = [];
      return;
    }

    if (this.tipoGraficoSeleccionado === 'heatmap' && this.variablesColor.length === 0) {
      console.warn('El mapa de calor requiere una variable adicional para el eje Y (Color)');
      this.snackBar.open('⚠ El mapa de calor requiere una variable adicional en "Color" para formar el eje Y', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-warning']
      });
      this.cargando = false;
      this.datosGrafico = [];
      return;
    }

    this.cargando = true;

    // Para boxplot, usar consulta sin agregar
    if (this.tipoGraficoSeleccionado === 'box') {
      this.actualizarBoxplot();
      return;
    }

    // Construir dimensiones: siempre eje X, más variable de color si existe
    const dimensiones = [this.variablesEjeX[0].nombre];
    if (this.variablesColor.length > 0) {
      dimensiones.push(this.variablesColor[0].nombre);
    }

    // Obtener métrica seleccionada (por defecto AVG)
    const variableY = this.variablesEjeY[0];
    const metrica = variableY.metrica || 'AVG';
    
    // Construir la métrica según el tipo seleccionado
    let metricaQuery: string;
    if (metrica === 'COUNT') {
      // COUNT siempre cuenta registros, no necesita columna específica
      metricaQuery = 'COUNT(id)';
    } else if (metrica === 'PERCENTAGE') {
      // PERCENTAGE es AVG * 100 (para desertor: 0 o 1 -> 0% o 100%)
      metricaQuery = `AVG(${variableY.nombre})`;
    } else {
      // AVG, SUM, MIN, MAX necesitan la columna
      metricaQuery = `${metrica}(${variableY.nombre})`;
    }

    // Actualizar título del gráfico con la métrica
    const metricaLabel = TIPOS_METRICAS.find(m => m.value === metrica)?.label || metrica;
    this.tituloGrafico = `${metricaLabel} de ${variableY.nombre} por ${this.variablesEjeX[0].nombre}`;

    // Construir la consulta dinámica
    const consulta: ConsultaDinamica = {
      dimensiones: dimensiones,
      metricas: [metricaQuery],
      filtros: this.filtrosActivos,
      limite: 1000
    };

    console.log('Consulta a enviar:', consulta);
    console.log('Métrica seleccionada:', metrica, '->', metricaQuery);
    console.log('Variable de color:', this.variablesColor.length > 0 ? this.variablesColor[0].nombre : 'ninguna');

    // Realizar consulta
    this.apiService.consultaDinamica(consulta).subscribe({
      next: (resultado) => {
        console.log('✅ Resultado de API:', resultado);
        this.cargando = false;  // ⚠️ Desactivar loading ANTES de procesar
        
        // Usar setTimeout para asegurar que Angular actualice el DOM
        setTimeout(() => {
          this.procesarResultados(resultado.datos);
          console.log('📊 Datos del gráfico:', this.datosGrafico);
        }, 0);
      },
      error: (error) => {
        console.error('❌ Error en consulta:', error);
        alert('Error al generar gráfico. Revisa la consola (F12)');
        this.cargando = false;
      }
    });
  }

  /**
   * Convertir color hexadecimal a rgba con transparencia
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Detectar si una variable es un período académico (formato YYYY-S)
   */
  private esPeriodoAcademico(valor: string): boolean {
    return /^\d{4}-[12]$/.test(String(valor));
  }

  /**
   * Ordenar períodos académicos correctamente (ej: 2016-1, 2016-2, 2017-1, ...)
   */
  private ordenarPeriodos(a: string, b: string): number {
    const matchA = String(a).match(/^(\d{4})-([12])$/);
    const matchB = String(b).match(/^(\d{4})-([12])$/);
    
    if (!matchA || !matchB) {
      // Si no son períodos válidos, orden alfabético normal
      return String(a).localeCompare(String(b));
    }
    
    const [, yearA, semA] = matchA;
    const [, yearB, semB] = matchB;
    
    // Comparar por año primero, luego por semestre
    if (yearA !== yearB) {
      return parseInt(yearA) - parseInt(yearB);
    }
    return parseInt(semA) - parseInt(semB);
  }

  /**
   * Comparar etiquetas para ordenar ejes categóricos/numéricos
   */
  private compararEtiquetas(a: string, b: string): number {
    const valorA = String(a);
    const valorB = String(b);

    if (this.esPeriodoAcademico(valorA) && this.esPeriodoAcademico(valorB)) {
      return this.ordenarPeriodos(valorA, valorB);
    }

    const numA = parseFloat(valorA);
    const numB = parseFloat(valorB);

    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    return valorA.localeCompare(valorB);
  }

  /**
   * Procesar resultados y generar configuración de Plotly
   */
  private procesarResultados(datos: any[]): void {
    if (!datos || datos.length === 0) {
      this.datosGrafico = [];
      this.datosOriginales = [];
      return;
    }

    // Guardar datos originales para tabla/CSV
    this.datosOriginales = datos;

    const ejeX = this.variablesEjeX[0].nombre;
    const variableY = this.variablesEjeY[0];
    const metrica = variableY.metrica || 'AVG';
    const esPercentage = metrica === 'PERCENTAGE';
    const metricaLabel = TIPOS_METRICAS.find(m => m.value === metrica)?.label || metrica;
    
    // Construir la clave de la métrica según el tipo
    let metricaKey: string;
    if (metrica === 'COUNT') {
      metricaKey = 'count'; // COUNT(id) devuelve 'count'
    } else if (metrica === 'PERCENTAGE') {
      // PERCENTAGE usa AVG pero luego multiplicamos por 100
      metricaKey = `avg_${variableY.nombre}`;
    } else {
      // AVG, SUM, MIN, MAX devuelven 'avg_{campo}', 'sum_{campo}', etc.
      const prefijo = metrica.toLowerCase();
      metricaKey = `${prefijo}_${variableY.nombre}`;
    }
    
    const variableColor = this.variablesColor.length > 0 ? this.variablesColor[0].nombre : null;

    if (this.tipoGraficoSeleccionado === 'heatmap') {
      this.procesarHeatmap(datos, ejeX, variableColor, metricaKey, metricaLabel, esPercentage);
      return;
    }

    console.log('🎨 Procesando resultados:');
    console.log('  - Eje X:', ejeX);
    console.log('  - Métrica:', metrica, '-> Clave:', metricaKey);
    console.log('  - Es porcentaje:', esPercentage);
    console.log('  - Variable de color:', variableColor || 'ninguna');
    console.log('  - Primer registro de ejemplo:', datos[0]);

    // Si hay variable de color, crear un trace por cada valor único
    if (variableColor) {
      // Obtener valores únicos de la variable de color
      const valoresColor = [...new Set(datos.map(d => d[variableColor]))].sort();
      console.log('Valores únicos de color:', valoresColor);

      // Paleta de colores
      const colores = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
      ];

      // Crear un trace por cada valor de color
      this.datosGrafico = valoresColor.map((valorColor, index) => {
        const datosFiltrados = datos.filter(d => d[variableColor] === valorColor);
        
        // Ordenar datos por X para gráficos de líneas
        // Esto evita que las líneas se crucen de forma incorrecta
        datosFiltrados.sort((a, b) => {
          const xA = String(a[ejeX]);
          const xB = String(b[ejeX]);
          
          // Si son períodos académicos, usar ordenamiento especial
          if (this.esPeriodoAcademico(xA) && this.esPeriodoAcademico(xB)) {
            return this.ordenarPeriodos(xA, xB);
          }
          
          // Intentar ordenar numéricamente si es posible, sino alfabéticamente
          const numA = parseFloat(xA);
          const numB = parseFloat(xB);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return xA.localeCompare(xB);
        });
        
        // Convertir explícitamente a string para evitar parseado automático de fechas
        const xData = datosFiltrados.map(d => String(d[ejeX]));
        let yData = datosFiltrados.map(d => d[metricaKey]);
        
        // Si es porcentaje, multiplicar por 100
        if (esPercentage) {
          yData = yData.map(v => v * 100);
        }

        const trace: any = {
          x: xData,
          y: yData,
          type: this.mapearTipoPlotly(this.tipoGraficoSeleccionado),
          name: `${variableColor} = ${valorColor}`,
          marker: { color: colores[index % colores.length] }
        };

        // Configuraciones específicas por tipo
        if (this.tipoGraficoSeleccionado === 'line') {
          trace.mode = 'lines+markers';
          trace.line = { color: colores[index % colores.length], width: 2 };
        } else if (this.tipoGraficoSeleccionado === 'area') {
          // Gráfico de área: rellenar desde el eje Y=0
          const colorBase = colores[index % colores.length];
          trace.mode = 'lines';
          trace.line = { color: colorBase, width: 2 };
          trace.fill = 'tozeroy'; // Rellenar hasta el eje Y=0
          // Convertir hex a rgba para transparencia
          trace.fillcolor = this.hexToRgba(colorBase, 0.5); // 50% opacidad
        } else if (this.tipoGraficoSeleccionado === 'scatter') {
          trace.mode = 'markers';
          trace.marker = { size: 10, color: colores[index % colores.length] };
        } else if (this.tipoGraficoSeleccionado === 'bar') {
          // Para barras agrupadas
          trace.marker = { color: colores[index % colores.length] };
        }

        return trace;
      });
    } else {
      // Sin variable de color: un solo trace
      // Ordenar datos por X
      const datosOrdenados = [...datos].sort((a, b) => {
        const xA = String(a[ejeX]);
        const xB = String(b[ejeX]);
        
        // Si son períodos académicos, usar ordenamiento especial
        if (this.esPeriodoAcademico(xA) && this.esPeriodoAcademico(xB)) {
          return this.ordenarPeriodos(xA, xB);
        }
        
        const numA = parseFloat(xA);
        const numB = parseFloat(xB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return xA.localeCompare(xB);
      });
      
      // Convertir explícitamente a string para evitar parseado automático de fechas
      const xData = datosOrdenados.map(d => String(d[ejeX]));
      let yData = datosOrdenados.map(d => d[metricaKey]);
      
      // Si es porcentaje, multiplicar por 100
      if (esPercentage) {
        yData = yData.map(v => v * 100);
      }

      const trace: any = {
        x: xData,
        y: yData,
        type: this.mapearTipoPlotly(this.tipoGraficoSeleccionado),
        name: this.tituloGrafico
      };

      // Configuraciones específicas por tipo
      if (this.tipoGraficoSeleccionado === 'bar') {
        trace.marker = { color: '#3f51b5' };
      } else if (this.tipoGraficoSeleccionado === 'line') {
        trace.mode = 'lines+markers';
        trace.line = { color: '#3f51b5', width: 2 };
      } else if (this.tipoGraficoSeleccionado === 'area') {
        // Gráfico de área: rellenar desde el eje Y=0
        trace.mode = 'lines';
        trace.line = { color: '#3f51b5', width: 2 };
        trace.fill = 'tozeroy'; // Rellenar hasta el eje Y=0
        trace.fillcolor = this.hexToRgba('#3f51b5', 0.5); // Color con 50% opacidad
      } else if (this.tipoGraficoSeleccionado === 'scatter') {
        trace.mode = 'markers';
        trace.marker = { size: 10, color: '#3f51b5' };
      }

      this.datosGrafico = [trace];
    }

    // Calcular rotación del eje X basada en longitud de etiquetas
    const etiquetasX = datos.map(d => String(d[ejeX]));
    const tieneEtiquetasLargas = etiquetasX.some(etiqueta => etiqueta.length > 5);
    const tickangleX = tieneEtiquetasLargas ? -90 : 0;

    // Ajustar márgenes cuando hay rotación de etiquetas
    const margin = tieneEtiquetasLargas 
      ? { t: 50, r: 50, b: 120, l: 60 } // Margen inferior mayor para etiquetas rotadas
      : { t: 50, r: 50, b: 50, l: 60 };

    // Layout
    this.layoutGrafico = {
      title: this.tituloGrafico,
      margin: margin,
      xaxis: { 
        title: ejeX,
        tickangle: tickangleX,
        automargin: true, // Ajuste automático de márgenes
        type: 'category' // FORZAR tipo categórico para evitar parseado de fechas
      },
      yaxis: { 
        title: `${metricaLabel} de ${this.variablesEjeY[0].nombre}`,
        automargin: true,
        // Si es porcentaje, fijar rango de 0 a 100 y agregar símbolo %
        ...(esPercentage ? { range: [0, 100], ticksuffix: '%' } : {})
      },
      showlegend: true,
      hovermode: 'closest',
      // Para barras agrupadas cuando hay variable de color
      barmode: variableColor && this.tipoGraficoSeleccionado === 'bar' ? 'group' : 'relative'
    };

    // Config
    this.configGrafico = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };
  }

  /**
   * Procesar resultados para mapas de calor
   * 
   * Lógica invertida para que tenga más sentido:
   * - Eje X (categórica) → columnas del heatmap (x)
   * - Color (categórica) → filas del heatmap (y)
   * - Eje Y (numérica con métrica) → valores que colorean las celdas (z)
   */
  private procesarHeatmap(
    datos: any[],
    ejeX: string,
    variableColor: string | null,
    metricaKey: string,
    metricaLabel: string,
    esPercentage: boolean
  ): void {
    if (!variableColor) {
      // Si no hay variable de color, mostrar mensaje de error
      this.datosGrafico = [];
      this.snackBar.open('⚠ Para mapas de calor necesitas una variable categórica en "Color"', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'left',
        verticalPosition: 'bottom',
        panelClass: ['snackbar-warning']
      });
      return;
    }

    // Eje X del heatmap = variable en Eje X (columnas)
    // Eje Y del heatmap = variable en Color (filas)
    const valoresX = [...new Set(datos.map(d => String(d[ejeX])))];
    const valoresY = [...new Set(datos.map(d => String(d[variableColor])))];

    const valoresXOrdenados = valoresX.sort((a, b) => this.compararEtiquetas(a, b));
    const valoresYOrdenados = valoresY.sort((a, b) => this.compararEtiquetas(a, b));

    const indiceX = new Map<string, number>();
    valoresXOrdenados.forEach((valor, idx) => indiceX.set(valor, idx));

    const indiceY = new Map<string, number>();
    valoresYOrdenados.forEach((valor, idx) => indiceY.set(valor, idx));

    // Matriz Z: filas = valoresY (variable de Color), columnas = valoresX (variable de Eje X)
    const matrizZ = valoresYOrdenados.map(() => valoresXOrdenados.map(() => 0));

    datos.forEach(d => {
      const valorX = String(d[ejeX]);
      const valorY = String(d[variableColor]);

      if (!indiceX.has(valorX) || !indiceY.has(valorY)) {
        return;
      }

      let valor = d[metricaKey];
      if (valor === undefined || valor === null) {
        valor = 0;
      }

      if (typeof valor === 'string') {
        const parsed = parseFloat(valor);
        valor = isNaN(parsed) ? 0 : parsed;
      }

      if (esPercentage) {
        valor = valor * 100;
      }

      // matrizZ[fila][columna] = matrizZ[y][x]
      matrizZ[indiceY.get(valorY)!][indiceX.get(valorX)!] = valor;
    });

    const tieneEtiquetasLargasX = valoresXOrdenados.some(etiqueta => etiqueta.length > 5);
    const tieneEtiquetasLargasY = valoresYOrdenados.some(etiqueta => etiqueta.length > 5);
    const tickangleX = tieneEtiquetasLargasX ? -90 : 0;
    const tickangleY = tieneEtiquetasLargasY ? -90 : 0;
    
    const margin = tieneEtiquetasLargasX
      ? { t: 50, r: 70, b: 120, l: tieneEtiquetasLargasY ? 120 : 80 }
      : { t: 50, r: 70, b: 60, l: tieneEtiquetasLargasY ? 120 : 80 };

    // Escala de colores personalizada: verde claro (valores bajos) → rojo vino oscuro (valores altos)
    // Perfecta para deserción: no desertores en verde, desertores en rojo
    const colorscalePersonalizada: any = [
      [0, '#c8e6c9'],      // Verde claro para valores mínimos (no desertores)
      [0.25, '#a5d6a7'],   // Verde medio-claro
      [0.5, '#81c784'],    // Verde medio
      [0.75, '#e57373'],   // Rojo claro
      [1, '#c62828']       // Rojo vino tinto oscuro para valores máximos (desertores)
    ];

    this.datosGrafico = [
      {
        x: valoresXOrdenados,
        y: valoresYOrdenados,
        z: matrizZ,
        type: 'heatmap',
        hoverongaps: false,
        colorscale: colorscalePersonalizada,
        colorbar: {
          title: esPercentage ? `${metricaLabel} (%)` : metricaLabel
        }
      }
    ];

    this.layoutGrafico = {
      title: this.tituloGrafico,
      margin: margin,
      xaxis: {
        title: ejeX,
        tickangle: tickangleX,
        automargin: true,
        type: 'category'
      },
      yaxis: {
        title: variableColor,
        tickangle: tickangleY,
        automargin: true,
        type: 'category'
      },
      hovermode: 'closest'
    };

    this.configGrafico = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };
  }

  /**
   * Mapear tipo de gráfico interno a tipo de Plotly
   */
  private mapearTipoPlotly(tipo: TipoGrafico): string {
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

  /**
   * Actualizar visualización desde el estado del servicio
   */
  private actualizarVisualizacion(): void {
    const config = this.visualizacionService.generarConfigPlotly();
    if (config) {
      this.datosGrafico = config.data;
      this.layoutGrafico = config.layout;
      this.configGrafico = config.config;
    }
  }

  /**
   * Actualizar boxplot con datos sin agregar
   */
  private actualizarBoxplot(): void {
    console.log('📦 Generando boxplot...');
    
    const dimensiones = [this.variablesEjeX[0].nombre];
    const valores = [this.variablesEjeY[0].nombre];
    
    if (this.variablesColor.length > 0) {
      dimensiones.push(this.variablesColor[0].nombre);
    }
    
    this.tituloGrafico = `Distribución de ${this.variablesEjeY[0].nombre} por ${this.variablesEjeX[0].nombre}`;
    
    this.apiService.consultaSinAgregar(dimensiones, valores, this.filtrosActivos, 5000).subscribe({
      next: (resultado) => {
        console.log('✅ Resultado boxplot:', resultado);
        this.cargando = false;
        
        setTimeout(() => {
          this.procesarResultadosBoxplot(resultado.datos);
        }, 0);
      },
      error: (error) => {
        console.error('❌ Error en consulta boxplot:', error);
        alert('Error al generar boxplot');
        this.cargando = false;
      }
    });
  }

  /**
   * Procesar resultados para boxplot
   */
  private procesarResultadosBoxplot(datos: any[]): void {
    if (!datos || datos.length === 0) {
      this.datosGrafico = [];
      this.datosOriginales = [];
      return;
    }

    this.datosOriginales = datos;
    const ejeX = this.variablesEjeX[0].nombre;
    const ejeY = this.variablesEjeY[0].nombre;
    const variableColor = this.variablesColor.length > 0 ? this.variablesColor[0].nombre : null;

    if (variableColor) {
      const valoresColor = [...new Set(datos.map(d => d[variableColor]))].sort();
      const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'];
      
      this.datosGrafico = valoresColor.map((valorColor, index) => {
        const datosFiltrados = datos.filter(d => d[variableColor] === valorColor);
        return {
          x: datosFiltrados.map(d => d[ejeX]),
          y: datosFiltrados.map(d => d[ejeY]),
          type: 'box',
          name: `${variableColor} = ${valorColor}`,
          marker: { color: colores[index % colores.length] },
          boxmean: 'sd'
        };
      });
      
      // Calcular rotación del eje X basada en longitud de etiquetas
      const etiquetasX = [...new Set(datos.map(d => String(d[ejeX])))];
      const tieneEtiquetasLargas = etiquetasX.some(etiqueta => etiqueta.length > 5);
      const tickangleX = tieneEtiquetasLargas ? -90 : 0;

      // Ajustar márgenes cuando hay rotación
      const margin = tieneEtiquetasLargas 
        ? { t: 50, r: 50, b: 120, l: 60 }
        : { t: 50, r: 50, b: 50, l: 60 };

      this.layoutGrafico = {
        title: this.tituloGrafico,
        margin: margin,
        xaxis: { title: ejeX, tickangle: tickangleX, automargin: true },
        yaxis: { title: ejeY, automargin: true },
        boxmode: 'group',
        showlegend: true
      };
    } else {
      const categorias = [...new Set(datos.map(d => d[ejeX]))].sort();
      
      this.datosGrafico = categorias.map(categoria => ({
        y: datos.filter(d => d[ejeX] === categoria).map(d => d[ejeY]),
        type: 'box',
        name: String(categoria),
        boxmean: 'sd',
        marker: { color: '#3f51b5' }
      }));
      
      // Calcular rotación del eje X basada en longitud de etiquetas
      const etiquetasX = categorias.map(c => String(c));
      const tieneEtiquetasLargas = etiquetasX.some(etiqueta => etiqueta.length > 5);
      const tickangleX = tieneEtiquetasLargas ? -90 : 0;

      // Ajustar márgenes cuando hay rotación
      const margin = tieneEtiquetasLargas 
        ? { t: 50, r: 50, b: 120, l: 60 }
        : { t: 50, r: 50, b: 50, l: 60 };

      this.layoutGrafico = {
        title: this.tituloGrafico,
        margin: margin,
        xaxis: { title: ejeX, tickangle: tickangleX, automargin: true },
        yaxis: { title: ejeY, automargin: true },
        showlegend: true
      };
    }

    this.configGrafico = { responsive: true, displayModeBar: true, displaylogo: false };
  }

  /**
   * Resetear todo
   */
  resetear(): void {
    this.variablesEjeX = [];
    this.variablesEjeY = [];
    this.variablesColor = [];
    this.filtrosActivos = [];
    this.datosGrafico = [];
    this.visualizacionService.resetear();
  }
}

