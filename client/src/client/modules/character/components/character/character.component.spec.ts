import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CharacterComponent} from './character.component';
import {TestModule} from '../../../test.module';
import {Character} from '../../models/character.model';

describe('CharacterComponent', () => {
  let component: CharacterComponent;
  let fixture: ComponentFixture<CharacterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [TestModule]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CharacterComponent);
    component = fixture.componentInstance;

    component.index = 0;
    component.character = new Character();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
