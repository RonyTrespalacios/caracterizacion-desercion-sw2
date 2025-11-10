import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTableModule } from '@angular/material/table';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Components
import { GraficoComponent } from './components/grafico/grafico.component';
import { FiltroComponent } from './components/filtro/filtro.component';
import { VariableSelectorComponent } from './components/variable-selector/variable-selector.component';
import { DropZoneComponent } from './components/drop-zone/drop-zone.component';

const MATERIAL_MODULES = [
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatSelectModule,
  MatFormFieldModule,
  MatInputModule,
  MatCheckboxModule,
  MatChipsModule,
  MatProgressSpinnerModule,
  MatTooltipModule,
  MatButtonToggleModule,
  MatExpansionModule,
  MatAutocompleteModule,
  MatTableModule,
  DragDropModule
];

const COMPONENTS = [
  GraficoComponent,
  FiltroComponent,
  VariableSelectorComponent,
  DropZoneComponent
];

@NgModule({
  declarations: COMPONENTS,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ...MATERIAL_MODULES,
    ...COMPONENTS
  ]
})
export class SharedModule { }

