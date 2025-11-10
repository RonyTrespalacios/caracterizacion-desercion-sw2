import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Material Design
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DragDropModule } from '@angular/cdk/drag-drop';

// App
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Core
import { ApiService } from '@core/services/api.service';
import { VisualizacionService } from '@core/services/visualizacion.service';

// Shared Components
import { SharedModule } from './shared/shared.module';

// Feature Modules
import { DashboardModule } from './features/dashboard/dashboard.module';
import { DataExplorerModule } from './features/data-explorer/data-explorer.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    
    // Material
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatExpansionModule,
    MatSliderModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    DragDropModule,
    
    // App Modules
    SharedModule,
    DashboardModule,
    DataExplorerModule
  ],
  providers: [
    ApiService,
    VisualizacionService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

