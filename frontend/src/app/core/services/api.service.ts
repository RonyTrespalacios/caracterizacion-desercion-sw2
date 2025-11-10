/**
 * Servicio principal para comunicación con la API backend
 */
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '@environments/environment';
import {
  DatosEstudiante,
  EsquemaDatos,
  ConsultaDinamica,
  ResultadoConsulta,
  Estadisticas
} from '@core/models/estudiante.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = environment.apiUrl;
  
  // Estado global del esquema de datos (cache)
  private esquemaDatosSubject = new BehaviorSubject<EsquemaDatos | null>(null);
  public esquemaDatos$ = this.esquemaDatosSubject.asObservable();
  
  // Estado global de estadísticas (cache)
  private estadisticasSubject = new BehaviorSubject<Estadisticas | null>(null);
  public estadisticas$ = this.estadisticasSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener el esquema de datos (metadatos de columnas)
   */
  getEsquemaDatos(): Observable<EsquemaDatos> {
    return this.http.get<EsquemaDatos>(`${this.baseUrl}/data/schema/resumen/`)
      .pipe(
        tap(esquema => this.esquemaDatosSubject.next(esquema))
      );
  }

  /**
   * Obtener estadísticas generales
   */
  getEstadisticas(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(`${this.baseUrl}/data/estudiantes/estadisticas/`)
      .pipe(
        tap(stats => this.estadisticasSubject.next(stats))
      );
  }

  /**
   * Realizar una consulta dinámica
   */
  consultaDinamica(consulta: ConsultaDinamica): Observable<ResultadoConsulta> {
    return this.http.post<ResultadoConsulta>(
      `${this.baseUrl}/data/estudiantes/consulta_dinamica/`,
      consulta
    );
  }

  /**
   * Obtener todos los datos de estudiantes (paginado)
   */
  getTodosLosDatos(page: number = 1, pageSize: number = 100): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());
    
    return this.http.get<any>(`${this.baseUrl}/data/estudiantes/`, { params });
  }

  /**
   * Obtener valores únicos de una columna, opcionalmente aplicando filtros previos
   */
  getValoresUnicos(columna: string, filtros?: any[]): Observable<any> {
    if (filtros && filtros.length > 0) {
      // Usar POST para enviar filtros en el body
      return this.http.post<any>(`${this.baseUrl}/data/estudiantes/valores_unicos/`, {
        columna: columna,
        filtros: filtros
      });
    } else {
      // GET simple si no hay filtros
      const params = new HttpParams().set('columna', columna);
      return this.http.get<any>(`${this.baseUrl}/data/estudiantes/valores_unicos/`, { params });
    }
  }

  /**
   * Consulta sin agregar (datos crudos) para boxplots
   */
  consultaSinAgregar(dimensiones: string[], valores: string[], filtros: any[], limite: number = 5000): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/data/estudiantes/consulta_sin_agregar/`, {
      dimensiones,
      valores,
      filtros,
      limite
    });
  }

  /**
   * Cargar un archivo de datos (solo para admin)
   */
  cargarArchivo(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return this.http.post(`${this.baseUrl}/data/fuentes/`, formData);
  }

  // ========== ENDPOINTS DE ANALYTICS ==========

  /**
   * Análisis de deserción
   */
  getAnalisisDesercion(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/desercion/`);
  }

  /**
   * Análisis de rendimiento
   */
  getAnalisisRendimiento(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/rendimiento/`);
  }

  /**
   * Análisis de apoyos financieros
   */
  getAnalisisApoyos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/apoyos/`);
  }

  /**
   * Análisis de correlaciones
   */
  getCorrelaciones(): Observable<any> {
    return this.http.get(`${this.baseUrl}/analytics/correlaciones/`);
  }
}

