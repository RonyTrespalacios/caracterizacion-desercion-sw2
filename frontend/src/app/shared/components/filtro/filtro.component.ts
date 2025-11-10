import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { EsquemaColumna, Filtro } from '@core/models/estudiante.model';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-filtro',
  templateUrl: './filtro.component.html',
  styleUrls: ['./filtro.component.scss'],
  standalone: false
})
export class FiltroComponent implements OnInit, OnChanges {
  @Input() columnas: EsquemaColumna[] = [];
  @Input() filtrosActivos: Filtro[] = [];
  
  @Output() filtroAgregado = new EventEmitter<Filtro>();
  @Output() filtroRemovido = new EventEmitter<string>();
  @Output() filtrosLimpiados = new EventEmitter<void>();

  filtroForm!: FormGroup;
  columnaSeleccionada: EsquemaColumna | null = null;
  filtroTexto: string = '';
  private todasLasColumnas: EsquemaColumna[] = [];
  valoresSeleccionados: any[] = [];
  filtroEditando: Filtro | null = null; // Filtro que se está editando
  
  operadoresNumericos = [
    { value: 'eq', label: 'Igual a' },
    { value: 'ne', label: 'Diferente de' },
    { value: 'gt', label: 'Mayor que' },
    { value: 'gte', label: 'Mayor o igual que' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor o igual que' }
  ];

  operadoresCategoricos = [
    { value: 'eq', label: 'Igual a' },
    { value: 'ne', label: 'Diferente de' },
    { value: 'in', label: 'En lista' },
    { value: 'icontains', label: 'Contiene (sin mayúsculas)' }
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.filtroForm = this.fb.group({
      columna: [''],
      operador: [''],
      valor: ['']
    });

    // Guardar todas las columnas
    this.todasLasColumnas = [...this.columnas];

    // Observar cambios en la columna seleccionada
    this.filtroForm.get('columna')?.valueChanges.subscribe(valor => {
      // Si es un objeto EsquemaColumna, actualizar columna seleccionada
      if (valor && typeof valor === 'object' && 'nombre' in valor) {
        const columna = valor as EsquemaColumna;
        this.columnaSeleccionada = columna;
        this.filtroForm.patchValue({ operador: '', valor: '' }, { emitEvent: false });
        this.filtroTexto = ''; // Limpiar búsqueda
        this.valoresSeleccionados = []; // Limpiar valores seleccionados
        
        console.log('Columna seleccionada:', this.columnaSeleccionada);
        console.log('Filtros activos actuales:', this.filtrosActivos.length);
        
        // Verificar si esta columna necesita valores únicos dinámicos
        // (categórica o numérica con menos de 40 valores únicos)
        const necesitaValoresUnicos = columna.cantidad_valores_unicos && 
                                      columna.cantidad_valores_unicos > 0 &&
                                      (columna.tipo === 'categorico' || 
                                       (columna.tipo === 'numerico' && columna.cantidad_valores_unicos < 40));
        
        // SIEMPRE obtener valores únicos dinámicamente si la columna los necesita
        // Esto asegura que los valores reflejen los filtros activos actuales
        if (necesitaValoresUnicos) {
          const filtrosRelevantes = this.filtrosActivos.filter(f => f.columna !== columna.nombre);
          console.log(`🔄 Obteniendo valores únicos frescos para "${columna.nombre}" con ${filtrosRelevantes.length} filtro(s) activo(s)`);
          this.obtenerValoresUnicosDinamicos(columna.nombre);
        }
      } else if (!valor || valor === '') {
        this.columnaSeleccionada = null;
        this.filtroTexto = '';
        this.valoresSeleccionados = [];
      }
    });
    
    // Observar cambios en el operador para debug
    this.filtroForm.get('operador')?.valueChanges.subscribe(operador => {
      console.log('Operador seleccionado:', operador);
      console.log('Es múltiple selección:', this.esMultipleSelection);
      console.log('Columna actual:', this.columnaSeleccionada?.nombre);
      if (this.columnaSeleccionada) {
        console.log('Tiene valores únicos:', !!this.columnaSeleccionada.valores_unicos);
        console.log('Cantidad de valores únicos:', this.columnaSeleccionada.valores_unicos?.length || 0);
      }
    });
    
    // Observar cambios en filtros activos para actualizar valores únicos cuando se agregan/remueven filtros
    // Esto se hace a través de ngOnChanges que se dispara cuando cambia @Input() filtrosActivos
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Actualizar cuando cambian las columnas
    if (changes['columnas'] && this.columnas && this.columnas.length > 0) {
      this.todasLasColumnas = [...this.columnas];
    }
    
    // Si cambian los filtros activos y hay una columna seleccionada, SIEMPRE actualizar sus valores únicos
    // Esto es crítico porque los valores únicos deben reflejar los filtros activos actuales
    if (changes['filtrosActivos'] && this.columnaSeleccionada) {
      const columna = this.columnaSeleccionada;
      
      // Verificar si esta columna necesita valores únicos dinámicos
      const necesitaValoresUnicos = columna.cantidad_valores_unicos && 
                                    columna.cantidad_valores_unicos > 0 &&
                                    (columna.tipo === 'categorico' || 
                                     (columna.tipo === 'numerico' && columna.cantidad_valores_unicos < 40));
      
      // SIEMPRE re-obtener valores únicos cuando cambian los filtros activos
      // Esto incluye cuando se ELIMINAN filtros (importante!)
      if (necesitaValoresUnicos) {
        const filtrosRelevantes = this.filtrosActivos.filter(f => f.columna !== columna.nombre);
        console.log(`🔄 Filtros cambiaron (${this.filtrosActivos.length} activos). Re-obteniendo valores únicos de "${columna.nombre}":`, 
                   filtrosRelevantes);
        // Siempre re-obtener valores únicos para reflejar los filtros activos actuales
        this.obtenerValoresUnicosDinamicos(columna.nombre);
      }
    }
  }

  get operadoresDisponibles() {
    if (!this.columnaSeleccionada) return [];
    
    if (this.columnaSeleccionada.tipo === 'numerico') {
      // Si tiene menos de 40 valores únicos, agregar operador "En lista"
      const cantValores = this.columnaSeleccionada.cantidad_valores_unicos || 0;
      if (cantValores > 0 && cantValores < 40) {
        return [...this.operadoresNumericos, { value: 'in', label: 'En lista' }];
      }
      return this.operadoresNumericos;
    }
    
    return this.operadoresCategoricos;
  }

  get esMultipleSelection(): boolean {
    const operador = this.filtroForm.get('operador')?.value;
    return operador === 'in';
  }

  /**
   * Editar un filtro existente
   */
  editarFiltro(filtro: Filtro): void {
    // Buscar la columna en el esquema
    const columna = this.todasLasColumnas.find(c => c.nombre === filtro.columna);
    
    if (!columna) {
      console.warn('Columna no encontrada para editar:', filtro.columna);
      return;
    }
    
    // Establecer el filtro que se está editando
    this.filtroEditando = filtro;
    
    // Cargar datos en el formulario
    this.columnaSeleccionada = columna;
    this.filtroTexto = columna.nombre;
    
    // Preparar valores para el formulario
    let valorForm: any = filtro.valor;
    if (filtro.operador === 'in' && Array.isArray(filtro.valor)) {
      this.valoresSeleccionados = [...filtro.valor];
      valorForm = filtro.valor;
    } else {
      this.valoresSeleccionados = [];
    }
    
    // Actualizar el formulario
    this.filtroForm.patchValue({
      columna: columna,
      operador: filtro.operador,
      valor: valorForm
    }, { emitEvent: false });
    
    // Obtener valores únicos si es necesario
    const necesitaValoresUnicos = !columna.valores_unicos && 
                                  columna.cantidad_valores_unicos && 
                                  columna.cantidad_valores_unicos > 0 &&
                                  (columna.tipo === 'categorico' || 
                                   (columna.tipo === 'numerico' && columna.cantidad_valores_unicos < 40));
    
    const tieneFiltrosActivos = this.filtrosActivos.length > 0 && 
                                this.filtrosActivos.some(f => f.columna !== columna.nombre);
    
    if (necesitaValoresUnicos || tieneFiltrosActivos) {
      this.obtenerValoresUnicosDinamicos(columna.nombre);
    }
    
    // Scroll al formulario
    setTimeout(() => {
      const formElement = document.querySelector('.filtro-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  /**
   * Cancelar edición de filtro
   */
  cancelarEdicion(): void {
    this.filtroEditando = null;
    this.columnaSeleccionada = null;
    this.filtroTexto = '';
    this.valoresSeleccionados = [];
    this.filtroForm.reset({
      columna: '',
      operador: '',
      valor: ''
    });
  }

  agregarFiltro(): void {
    if (this.filtroForm.valid && this.columnaSeleccionada) {
      const { operador, valor } = this.filtroForm.value;
      
      // Si es selección múltiple con checkboxes, usar valoresSeleccionados
      const valorFinal = (this.esMultipleSelection && this.valoresSeleccionados.length > 0) 
        ? this.valoresSeleccionados 
        : valor;
      
      const filtro: Filtro = {
        columna: this.columnaSeleccionada.nombre,
        operador,
        valor: valorFinal
      };

      // Si se está editando, primero remover el filtro viejo
      if (this.filtroEditando) {
        this.filtroRemovido.emit(this.filtroEditando.columna);
        this.filtroEditando = null;
      }

      this.filtroAgregado.emit(filtro);
      this.filtroForm.reset();
      this.columnaSeleccionada = null;
      this.filtroTexto = '';
      this.valoresSeleccionados = [];
    }
  }

  removerFiltro(columna: string): void {
    // Si se está editando este filtro, cancelar la edición
    if (this.filtroEditando && this.filtroEditando.columna === columna) {
      this.cancelarEdicion();
    }
    this.filtroRemovido.emit(columna);
    // Nota: ngOnChanges se disparará automáticamente cuando filtrosActivos cambie
    // y actualizará los valores únicos de la columna seleccionada si existe
  }

  limpiarTodo(): void {
    this.filtrosLimpiados.emit();
  }

  getOperadorLabel(operador: string): string {
    const todos = [...this.operadoresNumericos, ...this.operadoresCategoricos];
    const op = todos.find(o => o.value === operador);
    return op ? op.label : operador;
  }

  /**
   * Formatear valor para mostrar (truncar si es muy largo o array)
   */
  getValorFormateado(valor: any): string {
    if (Array.isArray(valor)) {
      if (valor.length === 0) return 'Sin valores';
      if (valor.length === 1) return String(valor[0]);
      // Mostrar primeros 2 valores + cantidad restante
      const primeros = valor.slice(0, 2).join(', ');
      const restantes = valor.length - 2;
      return restantes > 0 
        ? `${primeros} +${restantes} más`
        : primeros;
    }
    
    const valorStr = String(valor);
    // Limitar a 50 caracteres
    if (valorStr.length > 50) {
      return valorStr.substring(0, 47) + '...';
    }
    return valorStr;
  }

  /**
   * Obtener valor completo para el tooltip
   */
  getValorCompleto(valor: any): string {
    if (Array.isArray(valor)) {
      return valor.join(', ');
    }
    return String(valor);
  }

  /**
   * Calcular similitud entre dos strings (Levenshtein simplificado)
   */
  private calcularSimilitud(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Si es exacto, máxima similitud
    if (s1 === s2) return 100;
    
    // Si empieza con el texto, alta similitud
    if (s2.startsWith(s1)) return 90;
    
    // Si contiene el texto, similitud media-alta
    if (s2.includes(s1)) return 70;
    
    // Calcular distancia de Levenshtein simplificada
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0) return len2 === 0 ? 100 : 0;
    if (len2 === 0) return 0;
    
    // Calcular caracteres comunes en orden
    let comunes = 0;
    let pos2 = 0;
    for (let i = 0; i < len1 && pos2 < len2; i++) {
      const char = s1[i];
      const pos = s2.indexOf(char, pos2);
      if (pos !== -1) {
        comunes++;
        pos2 = pos + 1;
      }
    }
    
    // Similitud basada en caracteres comunes y longitud
    const similitud = (comunes / Math.max(len1, len2)) * 100;
    
    // Bonus si los caracteres están en orden
    let orden = 0;
    pos2 = 0;
    for (let i = 0; i < len1 && pos2 < len2; i++) {
      if (s1[i] === s2[pos2]) {
        orden++;
        pos2++;
      }
    }
    
    return similitud + (orden / len1) * 20;
  }

  /**
   * Obtener columnas filtradas por texto de búsqueda con ordenamiento por similitud
   */
  get columnasFiltradas(): EsquemaColumna[] {
    let filtradas = [...this.todasLasColumnas];

    // Filtrar y ordenar por similitud
    if (this.filtroTexto && this.filtroTexto.trim() !== '') {
      const texto = this.filtroTexto.trim();
      
      // Calcular similitud para cada columna
      const columnasConSimilitud = filtradas.map(col => ({
        columna: col,
        similitud: this.calcularSimilitud(texto, col.nombre)
      }));
      
      // Filtrar solo las que tienen alguna similitud (mínimo 10%)
      filtradas = columnasConSimilitud
        .filter(item => item.similitud > 10)
        .sort((a, b) => b.similitud - a.similitud) // Ordenar por similitud descendente
        .map(item => item.columna);
    }

    return filtradas;
  }

  /**
   * Manejar búsqueda de columna
   */
  onBuscarColumna(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value;
    this.filtroTexto = valor;
    
    // Si el campo está vacío, limpiar selección
    if (!valor || valor.trim() === '') {
      this.columnaSeleccionada = null;
      // No actualizar el formControl aquí, dejar que el usuario seleccione del autocomplete
    }
  }

  /**
   * Cuando se selecciona una columna del autocomplete
   */
  onColumnaSeleccionada(event: any): void {
    const columna = event.option.value as EsquemaColumna;
    this.columnaSeleccionada = columna;
    // El formControl ya tiene el objeto columna, solo necesitamos resetear operador y valor
    this.filtroForm.patchValue({ 
      operador: '', 
      valor: '' 
    }, { emitEvent: false });
    this.filtroTexto = ''; // Limpiar búsqueda después de seleccionar
  }

  /**
   * Función para mostrar el nombre de la columna en el input
   */
  displayColumna = (columna: EsquemaColumna | string | null): string => {
    if (!columna) return '';
    if (typeof columna === 'string') return columna;
    return columna.nombre;
  }

  /**
   * Manejar Enter en el input de columna
   * Selecciona automáticamente el primer resultado filtrado
   */
  onEnterColumna(): void {
    const columnasFiltradas = this.columnasFiltradas;
    if (columnasFiltradas.length > 0) {
      // Seleccionar la primera columna de los resultados filtrados
      this.onColumnaSeleccionada(columnasFiltradas[0]);
      console.log('📌 Columna auto-seleccionada con ENTER:', columnasFiltradas[0].nombre);
    }
  }

  /**
   * Obtener valores únicos dinámicamente desde la API cuando no están en el esquema
   * Aplica filtros activos (excepto el de la columna actual) para pre-filtrar valores
   */
  obtenerValoresUnicosDinamicos(nombreColumna: string): void {
    // Preparar filtros activos excluyendo el de la columna actual
    const filtrosParaAplicar = this.filtrosActivos
      .filter(f => f.columna !== nombreColumna)
      .map(f => ({
        columna: f.columna,
        operador: f.operador,
        valor: f.valor
      }));
    
    console.log(`Obteniendo valores únicos de "${nombreColumna}" con filtros:`, filtrosParaAplicar);
    
    this.apiService.getValoresUnicos(nombreColumna, filtrosParaAplicar).subscribe({
      next: (respuesta) => {
        console.log('Valores únicos obtenidos:', respuesta);
        
        const valoresUnicos = respuesta.valores || [];
        const total = respuesta.total || 0;
        
        // Actualizar la columna en el array de todas las columnas
        const index = this.todasLasColumnas.findIndex(c => c.nombre === nombreColumna);
        if (index !== -1) {
          this.todasLasColumnas[index] = {
            ...this.todasLasColumnas[index],
            valores_unicos: valoresUnicos,
            cantidad_valores_unicos: total
          };
        }
        
        // Actualizar la columna seleccionada
        if (this.columnaSeleccionada && this.columnaSeleccionada.nombre === nombreColumna) {
          this.columnaSeleccionada = {
            ...this.columnaSeleccionada,
            valores_unicos: valoresUnicos,
            cantidad_valores_unicos: total
          };
          
          console.log('Columna actualizada con valores únicos filtrados:', this.columnaSeleccionada);
          console.log(`Total de valores únicos (filtrados): ${total}`);
        }
      },
      error: (error) => {
        console.error('Error al obtener valores únicos:', error);
      }
    });
  }

  /**
   * Verificar si un valor está seleccionado (para checkboxes)
   */
  isValorSeleccionado(valor: any): boolean {
    return this.valoresSeleccionados.includes(valor);
  }

  /**
   * Manejar cambio de checkbox de valor
   */
  onValorCheckboxChange(valor: any, checked: boolean): void {
    if (checked) {
      if (!this.valoresSeleccionados.includes(valor)) {
        this.valoresSeleccionados.push(valor);
      }
    } else {
      const index = this.valoresSeleccionados.indexOf(valor);
      if (index > -1) {
        this.valoresSeleccionados.splice(index, 1);
      }
    }
    
    // Actualizar el formControl con el array de valores seleccionados
    this.filtroForm.patchValue({ valor: this.valoresSeleccionados }, { emitEvent: false });
  }

  /**
   * Seleccionar todos los valores
   */
  seleccionarTodos(): void {
    if (!this.columnaSeleccionada || !this.columnaSeleccionada.valores_unicos) {
      return;
    }
    
    this.valoresSeleccionados = [...this.columnaSeleccionada.valores_unicos];
    this.filtroForm.patchValue({ valor: this.valoresSeleccionados }, { emitEvent: false });
  }

  /**
   * Deseleccionar todos los valores
   */
  deseleccionarTodos(): void {
    this.valoresSeleccionados = [];
    this.filtroForm.patchValue({ valor: [] }, { emitEvent: false });
  }
}

