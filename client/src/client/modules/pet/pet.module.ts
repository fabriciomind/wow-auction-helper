import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {PetsValueComponent} from './components/pets-value.component';
import {MatCardModule, MatPaginatorModule} from '@angular/material';
import {IconModule} from '../icon/icon.module';
import {TableModule} from '../table/table.module';
import {UtilModule} from '../util/util.module';
import {CharacterModule} from '../character/character.module';

@NgModule({
  declarations: [
    PetsValueComponent],
  imports: [
    CommonModule,
    MatCardModule,
    IconModule,
    TableModule,
    MatPaginatorModule,
    UtilModule,
    CharacterModule
  ]
})
export class PetModule {
}
