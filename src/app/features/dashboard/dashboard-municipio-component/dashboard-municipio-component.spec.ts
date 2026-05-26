import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardMunicipioComponent } from './dashboard-municipio-component';

describe('DashboardMunicipioComponent', () => {
  let component: DashboardMunicipioComponent;
  let fixture: ComponentFixture<DashboardMunicipioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardMunicipioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardMunicipioComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
