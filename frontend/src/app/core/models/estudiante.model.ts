/**
 * Modelos de datos para el dominio de Trayectoria Estudiantil
 */

export interface DatosEstudiante {
  id?: number;
  programa: string;
  facultad: string;
  periodo_ingreso: string;
  ultimo_periodo_estado: string;
  ultimo_estado: string;
  desertor: number;
  estado_modificado?: string;
  tipo_desercion?: string;
  semestres_registrados: number;
  sexo: string;
  estrato: number;
  edad_ingreso: number;
  edad_ultimo_estado: number;
  promedio_carrera: number;
  promedio_primer_semestre: number;
  creditos_aprobados: number;
  creditos_aprobados_porcentaje: number;
  creditos_reprobados: number;
  cantidad_materias_reprobadas: number;
  grupo_etnico: string;
  tipo_colegio: string;
  ciudad_residencia?: string;
  departamento_residencia?: string;
  [key: string]: any; // Permitir acceso dinámico a propiedades
}

export interface EsquemaColumna {
  nombre: string;
  tipo: 'numerico' | 'categorico' | 'texto' | 'fecha';
  filtrable: boolean;
  visualizable: boolean;
  valores_unicos?: any[];
  cantidad_valores_unicos: number;
  valor_minimo?: number;
  valor_maximo?: number;
  descripcion?: string;
}

export interface EsquemaDatos {
  columnas: EsquemaColumna[];
  total_columnas: number;
  columnas_filtrables: number;
  columnas_numericas: number;
  columnas_categoricas: number;
}

export interface Filtro {
  columna: string;
  operador: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'icontains';
  valor: any;
}

export interface ConsultaDinamica {
  dimensiones?: string[];
  metricas?: string[];
  filtros?: Filtro[];
  orden?: string;
  limite?: number;
}

export interface ResultadoConsulta {
  tipo: 'datos_crudos' | 'datos_agregados';
  datos: any[];
  total: number;
  dimensiones?: string[];
  metricas?: string[];
}

export interface Estadisticas {
  total_estudiantes: number;
  desertores: number;
  no_desertores: number;
  porcentaje_desercion: number;
  facultades: number;
  programas: number;
  periodos: number;
}

