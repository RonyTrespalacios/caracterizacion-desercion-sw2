import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';
import { EsquemaColumna, Filtro, ConsultaDinamica } from '@core/models/estudiante.model';

interface FiltroDesercion {
  nombre: string;
  columna: string;
  valores: any[];
  tipo: 'single' | 'multiple' | 'color-check';
  valorSeleccionado?: any;
  valoresSeleccionados?: any[];
  usarComoColor?: boolean; // Para separar por color en lugar de filtrar
}

@Component({
  selector: 'app-desercion',
  templateUrl: './desercion.component.html',
  styleUrls: ['./desercion.component.scss'],
  standalone: false
})
export class DesercionComponent implements OnInit {
  // Filtros disponibles
  filtrosDisponibles: FiltroDesercion[] = [];
  
  // Datos para gráficos
  datosEvolucionTemporal: any[] = [];
  layoutEvolucionTemporal: any = {};
  configEvolucionTemporal: any = {};
  datosOriginalesEvolucion: any[] = [];
  
  datosComparativo: any[] = [];
  layoutComparativo: any = {};
  configComparativo: any = {};
  datosOriginalesComparativo: any[] = [];
  
  // Estados
  cargando = false;
  cargandoFiltros = false;
  mostrarOpcionesAvanzadas = false;
  
  // KPI de deserción
  kpiDesercion = {
    porcentaje: 0,
    total: 0,
    desertores: 0,
    noDesertores: 0
  };
  
  // Filtro de tipo de programa
  tipoPrograma: 'todos' | 'pregrado' | 'posgrado' = 'todos';
  
  // Apoyos seleccionados para desagregar
  apoyosSeleccionados: string[] = [];
  
  // Columnas del esquema
  columnas: EsquemaColumna[] = [];
  
  // Columnas de apoyos/descuentos para agrupar
  columnasApoyos = [
    'descuento_equidad',
    'credito_fes',
    'credito_gobernacion',
    'descuento_deporte_cultura',
    'descuento_rendimiento_academico',
    'descuento_electoral',
    'descuento_asegura_solidaria',
    'descuento_confecoop',
    'descuento_congente',
    'descuento_excelencia',
    'descuento_hermano_conyuge',
    'apoyo_coorinoco',
    'descuento_representante',
    'descuento_socioeconomico',
    'descuento_trabajo_grado'
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.cargarEsquema();
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
      return String(a).localeCompare(String(b));
    }
    
    const [, yearA, semA] = matchA;
    const [, yearB, semB] = matchB;
    
    if (yearA !== yearB) {
      return parseInt(yearA) - parseInt(yearB);
    }
    return parseInt(semA) - parseInt(semB);
  }

  /**
   * Cargar esquema de datos y preparar filtros
   */
  private cargarEsquema(): void {
    this.cargandoFiltros = true;
    
    this.apiService.getEsquemaDatos().subscribe({
      next: (esquema: any) => {
        this.columnas = esquema.columnas;
        this.inicializarFiltros();
      },
      error: (error: any) => {
        console.error('Error cargando esquema:', error);
        this.cargandoFiltros = false;
      }
    });
  }

  /**
   * Inicializar filtros predefinidos
   */
  private inicializarFiltros(): void {
    const filtrosConfig = [
      { nombre: 'Período de Ingreso', columna: 'periodo_ingreso', tipo: 'multiple' as const, usarComoColor: false },
      { nombre: 'Facultad', columna: 'facultad', tipo: 'single' as const, usarComoColor: false },
      { nombre: 'Programa', columna: 'programa', tipo: 'single' as const, usarComoColor: false },
      { nombre: 'Género', columna: 'sexo', tipo: 'multiple' as const, usarComoColor: false },
      { nombre: 'SISBEN', columna: 'sisben', tipo: 'color-check' as const, usarComoColor: false },
      { nombre: 'Política de Gratuidad', columna: 'politica_gratuidad', tipo: 'color-check' as const, usarComoColor: false }
    ];

    let pendientes = filtrosConfig.length;

    filtrosConfig.forEach(config => {
      this.apiService.getValoresUnicos(config.columna).subscribe({
        next: (respuesta: any) => {
          // La API devuelve { valores: [...], columna: '...', total: ... }
          const valores = respuesta.valores || respuesta || [];
          this.filtrosDisponibles.push({
            nombre: config.nombre,
            columna: config.columna,
            valores: Array.isArray(valores) ? valores.sort() : [],
            tipo: config.tipo,
            valorSeleccionado: undefined,
            valoresSeleccionados: [],
            usarComoColor: config.usarComoColor || false
          });
          
          pendientes--;
          if (pendientes === 0) {
            this.cargandoFiltros = false;
            // Generar gráficos iniciales sin filtros
            this.actualizarGraficos();
          }
        },
        error: (error: any) => {
          console.error(`Error cargando valores únicos de ${config.columna}:`, error);
          pendientes--;
          if (pendientes === 0) {
            this.cargandoFiltros = false;
            this.actualizarGraficos();
          }
        }
      });
    });
  }

  /**
   * Obtener filtro por columna
   */
  getFiltro(columna: string): FiltroDesercion | undefined {
    return this.filtrosDisponibles.find(f => f.columna === columna);
  }

  /**
   * Al cambiar un filtro
   */
  onFiltroChange(): void {
    // Recargar valores dependientes
    const filtroFacultad = this.getFiltro('facultad');
    
    if (filtroFacultad?.valorSeleccionado) {
      // Si hay facultad seleccionada, recargar programas
      this.recargarProgramas(filtroFacultad.valorSeleccionado);
    } else {
      // Si no hay facultad, recargar todos los programas
      this.recargarProgramas(null);
    }
    
    // Actualizar gráficos
    this.actualizarGraficos();
  }

  /**
   * Recargar valores de programa según facultad seleccionada
   */
  private recargarProgramas(facultad: string | null): void {
    const filtroPrograma = this.getFiltro('programa');
    if (!filtroPrograma) return;

    const filtros: Filtro[] = facultad ? [{
      columna: 'facultad',
      operador: 'eq',
      valor: facultad
    }] : [];

    this.apiService.getValoresUnicos('programa', filtros).subscribe({
      next: (respuesta: any) => {
        // La API devuelve { valores: [...], columna: '...', total: ... }
        const valores = respuesta.valores || respuesta || [];
        filtroPrograma.valores = Array.isArray(valores) ? valores.sort() : [];
        
        // Si el valor seleccionado ya no está disponible, limpiarlo
        if (filtroPrograma.valorSeleccionado && 
            !valores.includes(filtroPrograma.valorSeleccionado)) {
          filtroPrograma.valorSeleccionado = undefined;
        }
      },
      error: (error: any) => {
        console.error('Error recargando programas:', error);
      }
    });
  }

  /**
   * Construir filtros activos desde las selecciones
   * @param incluirColorCheck - Si es true, incluye filtros tipo color-check que NO están marcados como usarComoColor
   */
  private construirFiltrosActivos(incluirColorCheck: boolean = false): Filtro[] {
    const filtros: Filtro[] = [];

    this.filtrosDisponibles.forEach(filtro => {
      if (filtro.tipo === 'single' && filtro.valorSeleccionado) {
        filtros.push({
          columna: filtro.columna,
          operador: 'eq',
          valor: filtro.valorSeleccionado
        });
      } else if (filtro.tipo === 'multiple' && filtro.valoresSeleccionados && filtro.valoresSeleccionados.length > 0) {
        filtros.push({
          columna: filtro.columna,
          operador: 'in',
          valor: filtro.valoresSeleccionados
        });
      } else if (incluirColorCheck && filtro.tipo === 'color-check' && !filtro.usarComoColor) {
        // Si es un filtro de color pero NO está marcado para separar por color, tratarlo como filtro normal
        if (filtro.valoresSeleccionados && filtro.valoresSeleccionados.length > 0) {
          filtros.push({
            columna: filtro.columna,
            operador: 'in',
            valor: filtro.valoresSeleccionados
          });
        }
      }
    });

    return filtros;
  }

  /**
   * Obtener variables que se usan para separar por color
   */
  private getVariablesColor(): string[] {
    const variablesFiltros = this.filtrosDisponibles
      .filter(f => f.tipo === 'color-check' && f.usarComoColor)
      .map(f => f.columna);
    
    // Agregar apoyos seleccionados
    return [...variablesFiltros, ...this.apoyosSeleccionados];
  }

  /**
   * Normalizar valores de SISBEN: "NO REGISTRA" o "SI"
   */
  private normalizarSisben(valor: any): string {
    const valorStr = String(valor).toUpperCase().trim();
    if (valorStr === 'NO REGISTRA' || valorStr === 'NO_REGISTRA') {
      return 'NO REGISTRA';
    }
    return 'SI';
  }

  /**
   * Determinar si un programa es posgrado
   */
  private esPosgrado(programa: string): boolean {
    const nombreUpper = String(programa).toUpperCase();
    return nombreUpper.includes('ESPECIALIZACION') ||
           nombreUpper.includes('ESPECIALIZACIÓN') ||
           nombreUpper.includes('MASTRIA') ||
           nombreUpper.includes('MAESTRIA') ||
           nombreUpper.includes('MAESTRÍA');
  }

  /**
   * Al cambiar el tipo de programa
   */
  onTipoProgramaChange(): void {
    this.onFiltroChange();
  }

  /**
   * Al cambiar selección de apoyos
   */
  onApoyoChange(apoyo: string, checked: boolean): void {
    if (checked) {
      if (!this.apoyosSeleccionados.includes(apoyo)) {
        this.apoyosSeleccionados.push(apoyo);
      }
    } else {
      this.apoyosSeleccionados = this.apoyosSeleccionados.filter(a => a !== apoyo);
    }
    this.onFiltroChange();
  }

  /**
   * Verificar si un apoyo está seleccionado
   */
  isApoyoSeleccionado(apoyo: string): boolean {
    return this.apoyosSeleccionados.includes(apoyo);
  }

  /**
   * Actualizar todos los gráficos y KPIs
   */
  private actualizarGraficos(): void {
    this.actualizarKPI();
    this.actualizarEvolucionTemporal();
    this.actualizarComparativo();
  }

  /**
   * Actualizar KPI de deserción
   */
  private actualizarKPI(): void {
    const filtrosActivos = this.construirFiltrosActivos(true); // Incluir todos los filtros
    
    // Incluir programa si hay filtro de tipo
    const dimensiones = ['desertor'];
    if (this.tipoPrograma !== 'todos') {
      dimensiones.push('programa');
    }

    const consulta: ConsultaDinamica = {
      dimensiones: dimensiones,
      metricas: ['COUNT(id)'],
      filtros: filtrosActivos,
      limite: 10000
    };

    this.apiService.consultaDinamica(consulta).subscribe({
      next: (resultado: any) => {
        let datos = resultado.datos || [];
        
        // Filtrar por tipo de programa si aplica
        if (this.tipoPrograma !== 'todos') {
          datos = datos.filter((d: any) => {
            const esPosgradoPrograma = this.esPosgrado(d.programa);
            return this.tipoPrograma === 'posgrado' ? esPosgradoPrograma : !esPosgradoPrograma;
          });
        }
        
        let totalDesertores = 0;
        let totalNoDesertores = 0;

        datos.forEach((d: any) => {
          if (d.desertor === 1) {
            totalDesertores += d.count || 0;
          } else if (d.desertor === 0) {
            totalNoDesertores += d.count || 0;
          }
        });

        const total = totalDesertores + totalNoDesertores;
        const porcentaje = total > 0 ? (totalDesertores / total) * 100 : 0;

        this.kpiDesercion = {
          porcentaje: porcentaje,
          total: total,
          desertores: totalDesertores,
          noDesertores: totalNoDesertores
        };
      },
      error: (error: any) => {
        console.error('Error calculando KPI:', error);
      }
    });
  }

  /**
   * Actualizar gráfico de evolución temporal
   * Muestra el porcentaje de deserción por período de ingreso
   */
  private actualizarEvolucionTemporal(): void {
    this.cargando = true;

    // Obtener TODOS los filtros activos (incluir color-check)
    let filtrosActivos = this.construirFiltrosActivos(true);
    
    // Agregar filtro de tipo de programa si aplica
    if (this.tipoPrograma !== 'todos') {
      // Este filtro se aplicará en el frontend después de recibir los datos
      // porque necesitamos filtrar por el nombre del programa
    }
    
    // Obtener variables para separar por color
    const variablesColor = this.getVariablesColor();
    
    // Dimensiones: siempre periodo_ingreso + variables de color si existen + programa si filtro de tipo
    const dimensiones = ['periodo_ingreso', ...variablesColor];
    
    // Si hay filtro de tipo de programa, necesitamos incluir 'programa' en las dimensiones para poder filtrar
    if (this.tipoPrograma !== 'todos' && !dimensiones.includes('programa')) {
      dimensiones.push('programa');
    }

    const consulta: ConsultaDinamica = {
      dimensiones: dimensiones,
      metricas: ['AVG(desertor)', 'COUNT(id)'],
      filtros: filtrosActivos,
      limite: 10000
    };

    console.log('📊 Consulta evolución temporal:', consulta);

    this.apiService.consultaDinamica(consulta).subscribe({
      next: (resultado: any) => {
        // Filtrar por tipo de programa si aplica
        let datosFiltrados = resultado.datos || [];
        if (this.tipoPrograma !== 'todos') {
          datosFiltrados = datosFiltrados.filter((d: any) => {
            const esPosgradoPrograma = this.esPosgrado(d.programa);
            return this.tipoPrograma === 'posgrado' ? esPosgradoPrograma : !esPosgradoPrograma;
          });
        }
        
        this.procesarEvolucionTemporal(datosFiltrados, variablesColor);
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error en evolución temporal:', error);
        this.cargando = false;
      }
    });
  }

  /**
   * Procesar datos de evolución temporal con desagregación por color
   */
  private procesarEvolucionTemporal(datos: any[], variablesColor: string[]): void {
    if (!datos || datos.length === 0) {
      this.datosEvolucionTemporal = [];
      this.datosOriginalesEvolucion = [];
      return;
    }

    // Guardar datos originales
    this.datosOriginalesEvolucion = datos.map(d => {
      const obj: any = {
        periodo_ingreso: d.periodo_ingreso,
        porcentaje_desercion: (d.avg_desertor * 100).toFixed(2),
        total_estudiantes: d.count
      };
      variablesColor.forEach(v => {
        obj[v] = d[v];
      });
      return obj;
    });

    // Paleta de colores
    const colores = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];

    // NORMALIZAR DATOS: agrupar SISBEN y procesar variables de color
    const datosNormalizados = datos.map(d => {
      const dNorm: any = { ...d };
      
      // Normalizar SISBEN si está en las variables de color
      if (variablesColor.includes('sisben')) {
        dNorm.sisben = this.normalizarSisben(d.sisben);
      }
      
      return dNorm;
    });

    // OBTENER TODOS LOS PERÍODOS ÚNICOS Y ORDENARLOS
    const todosLosPeriodos = [...new Set(datosNormalizados.map(d => String(d.periodo_ingreso)))];
    const periodosOrdenados = todosLosPeriodos.sort((a, b) => this.ordenarPeriodos(a, b));
    
    console.log('📅 Períodos ordenados:', periodosOrdenados);

    if (variablesColor.length === 0) {
      // Sin desagregación: una sola línea
      // Crear un mapa de período -> datos
      const mapaDatos = new Map<string, any>();
      datosNormalizados.forEach(d => {
        mapaDatos.set(String(d.periodo_ingreso), d);
      });

      // Construir arrays ordenados según periodosOrdenados
      const xData: string[] = [];
      const yData: number[] = [];
      const textData: string[] = [];

      periodosOrdenados.forEach(periodo => {
        const d = mapaDatos.get(periodo);
        if (d) {
          xData.push(periodo);
          yData.push(d.avg_desertor * 100);
          textData.push(`${(d.avg_desertor * 100).toFixed(1)}% (n=${d.count})`);
        }
      });

      const trace = {
        x: xData,
        y: yData,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Deserción',
        line: { color: '#d62728', width: 3 },
        marker: { size: 8, color: '#d62728' },
        text: textData,
        hovertemplate: '<b>%{x}</b><br>Deserción: %{y:.1f}%<extra></extra>'
      };

      this.datosEvolucionTemporal = [trace];
    } else {
      // Con desagregación: crear un trace por cada combinación de valores de color
      // Obtener combinaciones únicas
      const combinaciones = new Map<string, any[]>();
      
      datosNormalizados.forEach(d => {
        const clave = variablesColor.map(v => `${v}:${d[v]}`).join('|');
        if (!combinaciones.has(clave)) {
          combinaciones.set(clave, []);
        }
        combinaciones.get(clave)!.push(d);
      });

      this.datosEvolucionTemporal = Array.from(combinaciones.entries()).map(([clave, datosComb], index) => {
        // Crear mapa de período -> datos para esta combinación
        const mapaDatos = new Map<string, any>();
        datosComb.forEach(d => {
          mapaDatos.set(String(d.periodo_ingreso), d);
        });

        // Construir arrays ordenados según periodosOrdenados
        const xData: string[] = [];
        const yData: number[] = [];
        const textData: string[] = [];

        periodosOrdenados.forEach(periodo => {
          const d = mapaDatos.get(periodo);
          if (d) {
            xData.push(periodo);
            yData.push(d.avg_desertor * 100);
            textData.push(`${(d.avg_desertor * 100).toFixed(1)}% (n=${d.count})`);
          }
        });

        // Construir nombre del trace
        const nombre = variablesColor.map(v => {
          const valor = datosComb[0][v];
          return `${v}: ${valor}`;
        }).join(', ');

        return {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines+markers',
          name: nombre,
          line: { color: colores[index % colores.length], width: 2 },
          marker: { size: 6, color: colores[index % colores.length] },
          text: textData,
          hovertemplate: `<b>${nombre}</b><br>%{x}<br>Deserción: %{y:.1f}%<extra></extra>`
        };
      });
    }

    this.layoutEvolucionTemporal = {
      title: 'Evolución de la Deserción por Período de Ingreso',
      xaxis: {
        title: 'Período de Ingreso',
        type: 'category',
        categoryorder: 'array',
        categoryarray: periodosOrdenados, // Forzar el orden
        tickangle: -45,
        automargin: true
      },
      yaxis: {
        title: 'Porcentaje de Deserción (%)',
        range: [0, 100],
        ticksuffix: '%',
        automargin: true
      },
      hovermode: 'closest',
      margin: { t: 50, r: 50, b: 100, l: 60 },
      showlegend: variablesColor.length > 0
    };

    this.configEvolucionTemporal = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };
  }

  /**
   * Actualizar gráfico comparativo
   * Desagrega según los filtros activos
   */
  private actualizarComparativo(): void {
    const filtrosActivos = this.construirFiltrosActivos(true); // Incluir todos los filtros
    
    // Determinar dimensión de desagregación según filtros activos
    const { dimension, titulo } = this.determinarDesagregacion();
    
    // Incluir programa si hay filtro de tipo
    const dimensiones = [dimension];
    if (this.tipoPrograma !== 'todos' && dimension !== 'programa') {
      dimensiones.push('programa');
    }

    const consulta: ConsultaDinamica = {
      dimensiones: dimensiones,
      metricas: ['AVG(desertor)', 'COUNT(id)'],
      filtros: filtrosActivos.filter(f => f.columna !== dimension),
      limite: 1000
    };

    this.apiService.consultaDinamica(consulta).subscribe({
      next: (resultado: any) => {
        // Filtrar por tipo de programa si aplica
        let datosFiltrados = resultado.datos || [];
        if (this.tipoPrograma !== 'todos') {
          datosFiltrados = datosFiltrados.filter((d: any) => {
            const esPosgradoPrograma = this.esPosgrado(d.programa);
            return this.tipoPrograma === 'posgrado' ? esPosgradoPrograma : !esPosgradoPrograma;
          });
        }
        
        this.procesarComparativo(datosFiltrados, dimension, titulo);
      },
      error: (error: any) => {
        console.error('Error en comparativo:', error);
      }
    });
  }

  /**
   * Determinar dimensión de desagregación según filtros activos
   */
  private determinarDesagregacion(): { dimension: string, titulo: string } {
    const filtroFacultad = this.getFiltro('facultad');
    const filtroPrograma = this.getFiltro('programa');
    const filtroGenero = this.getFiltro('sexo');

    // Si hay programa específico seleccionado, desagregar por género
    if (filtroPrograma?.valorSeleccionado) {
      return {
        dimension: 'sexo',
        titulo: `Deserción por Género - ${filtroPrograma.valorSeleccionado}`
      };
    }

    // Si hay facultad específica seleccionada, desagregar por programa
    if (filtroFacultad?.valorSeleccionado) {
      return {
        dimension: 'programa',
        titulo: `Deserción por Programa - ${filtroFacultad.valorSeleccionado}`
      };
    }

    // Si hay géneros seleccionados, desagregar por facultad
    if (filtroGenero?.valoresSeleccionados && filtroGenero.valoresSeleccionados.length > 0) {
      return {
        dimension: 'facultad',
        titulo: 'Deserción por Facultad'
      };
    }

    // Por defecto, desagregar por facultad
    return {
      dimension: 'facultad',
      titulo: 'Deserción por Facultad'
    };
  }

  /**
   * Procesar datos del comparativo
   */
  private procesarComparativo(datos: any[], dimension: string, titulo: string): void {
    if (!datos || datos.length === 0) {
      this.datosComparativo = [];
      this.datosOriginalesComparativo = [];
      return;
    }

    // Guardar datos originales
    this.datosOriginalesComparativo = datos.map(d => ({
      [dimension]: d[dimension],
      porcentaje_desercion: (d.avg_desertor * 100).toFixed(2),
      total_estudiantes: d.count
    }));

    // Ordenar por porcentaje de deserción (descendente)
    const datosOrdenados = [...datos].sort((a, b) => b.avg_desertor - a.avg_desertor);

    const trace = {
      x: datosOrdenados.map(d => d.avg_desertor * 100),
      y: datosOrdenados.map(d => String(d[dimension])),
      type: 'bar',
      orientation: 'h',
      marker: {
        color: datosOrdenados.map(d => d.avg_desertor * 100),
        colorscale: [
          [0, '#2ca02c'],      // Verde para deserción baja
          [0.5, '#ff7f0e'],    // Naranja para deserción media
          [1, '#d62728']       // Rojo para deserción alta
        ],
        showscale: true,
        colorbar: {
          title: '% Deserción',
          ticksuffix: '%'
        }
      },
      text: datosOrdenados.map(d => `${(d.avg_desertor * 100).toFixed(1)}%`),
      textposition: 'outside',
      hovertemplate: '<b>%{y}</b><br>Deserción: %{x:.1f}%<br>Estudiantes: %{customdata}<extra></extra>',
      customdata: datosOrdenados.map(d => d.count)
    };

    this.datosComparativo = [trace];

    // Detectar si hay etiquetas largas
    const etiquetas = datosOrdenados.map(d => String(d[dimension]));
    const tieneEtiquetasLargas = etiquetas.some(e => e.length > 20);

    this.layoutComparativo = {
      title: titulo,
      xaxis: {
        title: 'Porcentaje de Deserción (%)',
        range: [0, 100],
        ticksuffix: '%',
        automargin: true
      },
      yaxis: {
        title: dimension === 'sexo' ? 'Género' : dimension.charAt(0).toUpperCase() + dimension.slice(1),
        automargin: true,
        tickfont: { size: tieneEtiquetasLargas ? 10 : 12 }
      },
      hovermode: 'closest',
      margin: { t: 50, r: 50, b: 50, l: tieneEtiquetasLargas ? 200 : 150 },
      showlegend: false
    };

    this.configComparativo = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false
    };
  }

  /**
   * Limpiar todos los filtros
   */
  limpiarFiltros(): void {
    this.filtrosDisponibles.forEach(filtro => {
      filtro.valorSeleccionado = undefined;
      filtro.valoresSeleccionados = [];
      if (filtro.tipo === 'color-check') {
        filtro.usarComoColor = false;
      }
    });
    
    this.tipoPrograma = 'todos';
    this.apoyosSeleccionados = [];
    
    // Recargar programas sin filtro de facultad
    this.recargarProgramas(null);
    
    this.actualizarGraficos();
  }

  /**
   * Verificar si hay filtros activos
   */
  get hayFiltrosActivos(): boolean {
    return this.filtrosDisponibles.some(f => 
      (f.tipo === 'single' && f.valorSeleccionado) ||
      (f.tipo === 'multiple' && f.valoresSeleccionados && f.valoresSeleccionados.length > 0)
    );
  }
}

