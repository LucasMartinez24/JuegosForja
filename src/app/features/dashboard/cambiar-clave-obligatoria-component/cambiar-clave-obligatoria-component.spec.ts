import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CambiarClaveObligatoriaComponent } from './cambiar-clave-obligatoria-component';

describe('CambiarClaveObligatoriaComponent', () => {
  let component: CambiarClaveObligatoriaComponent;
  let fixture: ComponentFixture<CambiarClaveObligatoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CambiarClaveObligatoriaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CambiarClaveObligatoriaComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
