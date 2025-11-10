import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '@app/shared/shared.module';
import { DataExplorerComponent } from './data-explorer.component';

const routes: Routes = [
  {
    path: '',
    component: DataExplorerComponent
  }
];

@NgModule({
  declarations: [
    DataExplorerComponent
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class DataExplorerModule { }

