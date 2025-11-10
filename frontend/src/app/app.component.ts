import { Component, OnInit } from '@angular/core';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'Sistema de Análisis de Trayectoria Estudiantil';
  sidenavOpen = true; // Abrir por defecto en pantallas grandes

  constructor(private apiService: ApiService) {
    // Detectar tamaño de pantalla al iniciar
    this.checkScreenSize();
  }

  ngOnInit(): void {
    // Cargar datos iniciales
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    // Cargar esquema de datos
    this.apiService.getEsquemaDatos().subscribe({
      next: (esquema) => {
        console.log('Esquema de datos cargado:', esquema);
      },
      error: (error) => {
        console.error('Error al cargar esquema:', error);
      }
    });

    // Cargar estadísticas
    this.apiService.getEstadisticas().subscribe({
      next: (stats) => {
        console.log('Estadísticas cargadas:', stats);
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
      }
    });
  }

  toggleSidenav(): void {
    this.sidenavOpen = !this.sidenavOpen;
  }

  private checkScreenSize(): void {
    // Cerrar sidenav en móviles por defecto
    if (window.innerWidth < 1024) {
      this.sidenavOpen = false;
    }
  }
}

