import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DragDropVariable } from '@core/models/visualizacion.model';

@Component({
  selector: 'app-variable-selector',
  templateUrl: './variable-selector.component.html',
  styleUrls: ['./variable-selector.component.scss'],
  standalone: false
})
export class VariableSelectorComponent {
  @Input() variables: DragDropVariable[] = [];
  @Input() variablesEnEjeX: DragDropVariable[] = [];
  @Input() variablesEnEjeY: DragDropVariable[] = [];
  @Input() variablesEnColor: DragDropVariable[] = [];
  @Input() titulo: string = 'Variables Disponibles';
  @Output() variableSeleccionada = new EventEmitter<DragDropVariable>();
  @Output() agregarEjeX = new EventEmitter<DragDropVariable>();
  @Output() agregarEjeY = new EventEmitter<DragDropVariable>();
  @Output() agregarColor = new EventEmitter<DragDropVariable>();

  filtroTexto: string = '';
  filtroTipo: 'todas' | 'numerico' | 'categorico' = 'todas';

  // Orden de relevancia para las variables
  private readonly ordenRelevancia: { [key: string]: number } = {
    // Variables más importantes primero (menor número = mayor relevancia)
    'desertor': 1,
    'promedio_carrera': 2,
    'creditos_reprobados': 3,
    'cantidad_materias_reprobadas': 4,
    'promedio_primer_semestre': 5,
    'estrato': 6,
    'creditos_aprobados_porcentaje': 7,
    'tipo_colegio': 8,
    'programa': 9,
    'facultad': 10,
    'sexo': 11,
    'edad_ingreso': 12,
    'credito_icetex': 13,
    'grupo_etnico': 14,
    'zona': 15,
    'ciudad_residencia': 16,
    'departamento_residencia': 17,
    'sisben': 18,
    'tipo_ingreso': 19,
    'modo_admision': 20,
    'estado_civil': 21,
    'semestres_registrados': 22,
    'conteo_matriculado': 23,
    'conteo_bajo_rendimiento': 24,
    'periodo_ingreso': 25,
    'ultimo_estado': 26,
    'creditos_aprobados': 27,
    'creditos_faltantes': 28,
    'total_creditos': 29,
    'tiene_hijos': 30,
  };

  get variablesFiltradas(): DragDropVariable[] {
    let filtradas = this.variables;

    // Filtrar por tipo primero
    if (this.filtroTipo !== 'todas') {
      filtradas = filtradas.filter(v => v.tipo === this.filtroTipo);
    }

    // Filtrar y ordenar por texto con búsqueda por similitud
    if (this.filtroTexto) {
      const textoLower = this.filtroTexto.toLowerCase();
      
      // Filtrar variables que contengan el texto o sean similares
      filtradas = filtradas.filter(v => 
        v.nombre.toLowerCase().includes(textoLower) ||
        (v.descripcion && v.descripcion.toLowerCase().includes(textoLower)) ||
        this.calcularSimilitud(v.nombre.toLowerCase(), textoLower) > 0.5
      );
      
      // Ordenar por similitud (mayor similitud primero)
      return filtradas.sort((a, b) => {
        const similitudA = this.calcularSimilitud(a.nombre.toLowerCase(), textoLower);
        const similitudB = this.calcularSimilitud(b.nombre.toLowerCase(), textoLower);
        
        // Si uno contiene el texto exacto, priorizar
        const contieneA = a.nombre.toLowerCase().includes(textoLower) ? 1 : 0;
        const contieneB = b.nombre.toLowerCase().includes(textoLower) ? 1 : 0;
        
        if (contieneA !== contieneB) {
          return contieneB - contieneA; // Mayor primero
        }
        
        // Ordenar por similitud
        return similitudB - similitudA; // Mayor similitud primero
      });
    }

    // Si no hay texto de búsqueda, ordenar por relevancia
    return filtradas.sort((a, b) => {
      const relevanciaA = this.ordenRelevancia[a.nombre] || 9999;
      const relevanciaB = this.ordenRelevancia[b.nombre] || 9999;
      
      if (relevanciaA !== relevanciaB) {
        return relevanciaA - relevanciaB;
      }
      
      // Si tienen la misma relevancia (o no están en la lista), ordenar alfabéticamente
      return a.nombre.localeCompare(b.nombre);
    });
  }

  /**
   * Calcular similitud entre dos strings usando Levenshtein
   * Retorna un valor entre 0 (sin similitud) y 1 (idénticos)
   */
  private calcularSimilitud(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distancia = this.levenshteinDistance(longer, shorter);
    return (longer.length - distancia) / longer.length;
  }

  /**
   * Calcular distancia de Levenshtein entre dos strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  onVariableClick(variable: DragDropVariable): void {
    this.variableSeleccionada.emit(variable);
  }

  onAgregarEjeX(variable: DragDropVariable): void {
    console.log('Emitiendo agregarEjeX:', variable);
    this.agregarEjeX.emit(variable);
  }

  onAgregarEjeY(variable: DragDropVariable): void {
    if (variable.tipo !== 'numerico') {
      console.warn('Eje Y solo acepta variables numéricas');
      return;
    }
    console.log('Emitiendo agregarEjeY:', variable);
    this.agregarEjeY.emit(variable);
  }

  onAgregarColor(variable: DragDropVariable): void {
    if (!variable.puedeSerColor) {
      console.warn('Esta variable no puede usarse como color (muchos valores únicos)');
      return;
    }
    console.log('Emitiendo agregarColor:', variable);
    this.agregarColor.emit(variable);
  }

  getTooltipColor(variable: DragDropVariable): string {
    if (variable.puedeSerColor) {
      if (variable.tipo === 'categorico') {
        return 'Agregar a Color (categórico)';
      } else {
        return `Agregar a Color (${variable.cantidadValoresUnicos} valores únicos)`;
      }
    }
    return `No disponible para Color (${variable.cantidadValoresUnicos || 'muchos'} valores)`;
  }

  getIconoPorTipo(tipo: string): string {
    return tipo === 'numerico' ? 'looks_one' : 'label';
  }

  getColorPorTipo(tipo: string): string {
    return tipo === 'numerico' ? '#4caf50' : '#2196f3';
  }

  /**
   * Verifica si la variable ya está en el Eje X
   */
  estaEnEjeX(variable: DragDropVariable): boolean {
    return this.variablesEnEjeX.some(v => v.nombre === variable.nombre);
  }

  /**
   * Verifica si la variable ya está en el Eje Y
   */
  estaEnEjeY(variable: DragDropVariable): boolean {
    return this.variablesEnEjeY.some(v => v.nombre === variable.nombre);
  }

  /**
   * Verifica si la variable ya está en Color
   */
  estaEnColor(variable: DragDropVariable): boolean {
    return this.variablesEnColor.some(v => v.nombre === variable.nombre);
  }
}

