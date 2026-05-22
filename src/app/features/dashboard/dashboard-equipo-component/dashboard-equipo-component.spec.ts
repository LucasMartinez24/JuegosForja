import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardEquipoComponent } from './dashboard-equipo-component';

describe('DashboardEquipoComponent', () => {
  let component: DashboardEquipoComponent;
  let fixture: ComponentFixture<DashboardEquipoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardEquipoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardEquipoComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
