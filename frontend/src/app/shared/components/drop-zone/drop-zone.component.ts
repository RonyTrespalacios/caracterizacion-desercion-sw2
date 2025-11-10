import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DragDropVariable } from '@core/models/visualizacion.model';

@Component({
  selector: 'app-drop-zone',
  templateUrl: './drop-zone.component.html',
  styleUrls: ['./drop-zone.component.scss'],
  standalone: false
})
export class DropZoneComponent {
  @Input() titulo: string = 'Zona de Drop';
  @Input() descripcion: string = 'Haz clic en las flechas de las variables';
  @Input() icono: string = 'add';
  @Input() aceptaTipos: ('numerico' | 'categorico')[] = ['numerico', 'categorico'];
  @Input() multiple: boolean = false;
  @Input() variables: DragDropVariable[] = [];
  
  @Output() variableAgregada = new EventEmitter<DragDropVariable>();
  @Output() variableRemovida = new EventEmitter<DragDropVariable>();

  get tieneVariables(): boolean {
    return this.variables && this.variables.length > 0;
  }

  removerVariable(variable: DragDropVariable): void {
    this.variableRemovida.emit(variable);
  }

  getIconoPorTipo(tipo: string): string {
    return tipo === 'numerico' ? 'looks_one' : 'label';
  }

  getColorPorTipo(tipo: string): string {
    return tipo === 'numerico' ? '#4caf50' : '#2196f3';
  }
}

