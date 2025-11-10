/**
 * Modelos para configuración de visualizaciones
 */

export type TipoGrafico = 
  | 'bar' 
  | 'line' 
  | 'scatter' 
  | 'pie' 
  | 'area' 
  | 'box'
  | 'histogram'
  | 'heatmap';

export interface ConfiguracionGrafico {
  tipo: TipoGrafico;
  titulo: string;
  ejeX?: string;
  ejeY?: string;
  colorPor?: string;
  agregarPorcentaje?: boolean;
  apilar?: boolean;
  mostrarLeyenda?: boolean;
  ancho?: number;
  alto?: number;
}

export interface VariableSeleccionada {
  nombre: string;
  tipo: 'numerico' | 'categorico';
  eje?: 'x' | 'y' | 'color' | 'size';
}

export type TipoMetrica = 'AVG' | 'COUNT' | 'SUM' | 'MIN' | 'MAX' | 'PERCENTAGE';

export interface DragDropVariable {
  nombre: string;
  tipo: 'numerico' | 'categorico';
  descripcion?: string;
  cantidadValoresUnicos?: number;
  puedeSerColor?: boolean; // true si es categórica O numérica con pocos valores
  metrica?: TipoMetrica; // Métrica seleccionada para variables numéricas en eje Y
}

export const TIPOS_METRICAS: { value: TipoMetrica; label: string }[] = [
  { value: 'AVG', label: 'Promedio' },
  { value: 'COUNT', label: 'Recuento' },
  { value: 'SUM', label: 'Suma' },
  { value: 'MIN', label: 'Mínimo' },
  { value: 'MAX', label: 'Máximo' },
  { value: 'PERCENTAGE', label: 'Porcentaje' }
];

export interface ZonaDropConfig {
  id: string;
  titulo: string;
  descripcion: string;
  aceptaTipos: ('numerico' | 'categorico')[];
  multiple: boolean;
  variables: DragDropVariable[];
}

export const TIPOS_GRAFICOS: { value: TipoGrafico; label: string; icon: string }[] = [
  { value: 'bar', label: 'Barras', icon: 'bar_chart' },
  { value: 'line', label: 'Líneas', icon: 'show_chart' },
  { value: 'scatter', label: 'Dispersión', icon: 'scatter_plot' },
  { value: 'pie', label: 'Circular', icon: 'pie_chart' },
  { value: 'area', label: 'Área', icon: 'area_chart' },
  { value: 'box', label: 'Caja', icon: 'inbox' },
  { value: 'histogram', label: 'Histograma', icon: 'bar_chart' },
  { value: 'heatmap', label: 'Mapa de calor', icon: 'grid_on' }
];

