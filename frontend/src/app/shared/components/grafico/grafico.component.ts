import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, Renderer2, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

// Lazy load Plotly para reducir bundle inicial
let Plotly: any;

@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.scss'],
  standalone: false
})
export class GraficoComponent implements OnChanges, AfterViewInit {
  @Input() data: any[] = [];
  @Input() layout: any = {};
  @Input() config: any = {};
  @Input() loading: boolean = false;
  @Input() datosOriginales: any[] = []; // Datos crudos para tabla/CSV

  @ViewChild('plotlyChart', { static: false }) plotlyChart?: ElementRef;
  @ViewChild('plotlyChartFullscreen', { static: false }) plotlyChartFullscreen?: ElementRef;
  private isInitialized = false;
  private isFullscreenInitialized = false;
  mostrarTabla: boolean = false;
  mostrarPantallaCompleta: boolean = false;

  // Configuración por defecto de Plotly
  defaultLayout: any = {
    autosize: true,
    margin: { t: 50, r: 50, b: 50, l: 60 },
    paper_bgcolor: 'white',
    plot_bgcolor: '#f9f9f9',
    font: {
      family: 'Roboto, sans-serif',
      size: 12
    }
  };

  defaultConfig: any = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    // Habilitar botón de pantalla completa
    modeBarButtonsToAdd: [], // Mantener todos los botones por defecto excepto los removidos
    toImageButtonOptions: {
      format: 'png',
      filename: 'grafico',
      height: 800,
      width: 1200,
      scale: 1
    },
    // Configuración para pantalla completa
    doubleClick: 'reset', // Doble click para resetear zoom
    showTips: true // Mostrar tooltips en los botones
  };

  finalLayout: any = {};
  finalConfig: any = {};
  private fullscreenElement: HTMLElement | null = null;

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.finalLayout = { ...this.defaultLayout };
    this.finalConfig = { ...this.defaultConfig };
  }

  ngAfterViewInit(): void {
    this.renderPlot().catch(err => console.error('Error loading Plotly:', err));
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 GraficoComponent ngOnChanges:', changes);
    
    if (changes['layout']) {
      this.finalLayout = {
        ...this.defaultLayout,
        ...this.layout
      };
    }

    if (changes['config']) {
      this.finalConfig = {
        ...this.defaultConfig,
        ...this.config
      };
    }

    // Cuando cambia 'data' O cuando 'loading' pasa de true a false
    if (changes['data'] || (changes['loading'] && !this.loading)) {
      console.log('🎨 Intentando renderizar. isInitialized:', this.isInitialized, 'data:', this.data);
      // Usar setTimeout para asegurar que el ViewChild esté disponible
      setTimeout(() => {
        this.renderPlot().catch(err => console.error('Error rendering plot:', err));
      }, 0);
    }
  }

  private async renderPlot(): Promise<void> {
    console.log('🎯 renderPlot llamado. plotlyChart:', !!this.plotlyChart, 'loading:', this.loading, 'data.length:', this.data?.length);
    
    if (this.loading) {
      console.log('⏸️ Loading activo, esperando...');
      return;
    }
    
    if (!this.data || this.data.length === 0) {
      console.log('⚠️ No hay datos para renderizar');
      return;
    }
    
    if (!this.plotlyChart) {
      console.log('⚠️ ViewChild #plotlyChart no está disponible todavía');
      return;
    }

    console.log('🚀 Renderizando gráfico con Plotly...');
    
    // Lazy load Plotly solo cuando sea necesario
    if (!Plotly) {
      console.log('📦 Cargando Plotly.js...');
      const plotlyModule = await import('plotly.js/dist/plotly.js');
      Plotly = plotlyModule.default || plotlyModule;
      console.log('✅ Plotly cargado');
    }

    const element = this.plotlyChart.nativeElement;
    
    try {
      if (this.isInitialized) {
        console.log('🔄 Actualizando gráfico existente');
        await Plotly.react(element, this.data, this.finalLayout, this.finalConfig);
      } else {
        console.log('🆕 Creando nuevo gráfico');
        await Plotly.newPlot(element, this.data, this.finalLayout, this.finalConfig);
        this.isInitialized = true;
      }
      console.log('✅ Gráfico renderizado exitosamente');
    } catch (error) {
      console.error('❌ Error al renderizar gráfico:', error);
    }
  }

  /**
   * Alternar vista entre gráfico y tabla
   */
  toggleTabla(): void {
    this.mostrarTabla = !this.mostrarTabla;
    
    // Si volvemos al gráfico, forzar re-render después de que el DOM se actualice
    if (!this.mostrarTabla) {
      setTimeout(() => {
        this.renderPlot().catch(err => console.error('Error re-rendering plot:', err));
      }, 100);
    }
  }

  /**
   * Descargar datos como CSV
   */
  descargarCSV(): void {
    if (!this.datosOriginales || this.datosOriginales.length === 0) {
      console.warn('No hay datos para descargar');
      return;
    }

    // Obtener las columnas (keys del primer objeto)
    const columnas = Object.keys(this.datosOriginales[0]);
    
    // Crear encabezado CSV
    let csv = columnas.join(',') + '\n';
    
    // Añadir filas
    this.datosOriginales.forEach(fila => {
      const valores = columnas.map(col => {
        const valor = fila[col];
        // Escapar valores que contienen comas o comillas
        if (valor === null || valor === undefined) {
          return '';
        }
        const valorStr = String(valor);
        if (valorStr.includes(',') || valorStr.includes('"') || valorStr.includes('\n')) {
          return `"${valorStr.replace(/"/g, '""')}"`;
        }
        return valorStr;
      });
      csv += valores.join(',') + '\n';
    });

    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    const filename = `datos_grafico_${fecha}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ CSV descargado: ${filename}`);
  }

  /**
   * Obtener columnas de la tabla
   */
  get columnasTabla(): string[] {
    if (!this.datosOriginales || this.datosOriginales.length === 0) {
      return [];
    }
    return Object.keys(this.datosOriginales[0]);
  }

  /**
   * Abrir gráfico en pantalla completa
   */
  async abrirPantallaCompleta(): Promise<void> {
    if (!this.data || this.data.length === 0 || this.mostrarTabla) {
      return;
    }

    this.mostrarPantallaCompleta = true;
    
    // Esperar a que el DOM se actualice y mover el modal al body
    setTimeout(() => {
      this.moverModalAlBody();
      setTimeout(async () => {
        if (this.plotlyChartFullscreen) {
          await this.renderPlotFullscreen();
        }
      }, 50);
    }, 100);
  }

  /**
   * Mover el modal al body para que esté fuera de cualquier contenedor
   */
  private moverModalAlBody(): void {
    const modal = this.document.querySelector('.fullscreen-overlay');
    if (modal && modal.parentElement !== this.document.body) {
      this.renderer.appendChild(this.document.body, modal);
      this.fullscreenElement = modal as HTMLElement;
    }
  }

  /**
   * Cerrar pantalla completa
   */
  cerrarPantallaCompleta(): void {
    this.mostrarPantallaCompleta = false;
    this.isFullscreenInitialized = false;
    
    // Limpiar el elemento del body después de un pequeño delay
    setTimeout(() => {
      if (this.fullscreenElement && this.fullscreenElement.parentElement === this.document.body) {
        this.renderer.removeChild(this.document.body, this.fullscreenElement);
        this.fullscreenElement = null;
      }
    }, 300); // Esperar a que termine la animación
  }

  /**
   * Renderizar gráfico en pantalla completa
   */
  private async renderPlotFullscreen(): Promise<void> {
    if (!this.plotlyChartFullscreen) {
      return;
    }

    // Lazy load Plotly si es necesario
    if (!Plotly) {
      const plotlyModule = await import('plotly.js/dist/plotly.js');
      Plotly = plotlyModule.default || plotlyModule;
    }

    const element = this.plotlyChartFullscreen.nativeElement;
    
    try {
      // Calcular altura para pantalla completa (viewport height - header)
      const viewportHeight = window.innerHeight;
      const chartHeight = viewportHeight - 100; // 100px para header y márgenes

      const layoutFullscreen = {
        ...this.finalLayout,
        height: chartHeight,
        autosize: true
      };

      if (this.isFullscreenInitialized) {
        await Plotly.react(element, this.data, layoutFullscreen, this.finalConfig);
      } else {
        await Plotly.newPlot(element, this.data, layoutFullscreen, this.finalConfig);
        this.isFullscreenInitialized = true;
      }

      // Ajustar tamaño cuando cambie el viewport
      window.addEventListener('resize', () => {
        if (this.mostrarPantallaCompleta && this.plotlyChartFullscreen) {
          const newHeight = window.innerHeight - 100;
          Plotly.relayout(element, { height: newHeight });
        }
      });
    } catch (error) {
      console.error('❌ Error al renderizar gráfico en pantalla completa:', error);
    }
  }
}

