import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login-component/login-component';
import { DashboardEquipoComponent } from './features/dashboard/dashboard-equipo-component/dashboard-equipo-component';
import { equipoGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { municipioGuard } from './core/guards/municipio.guard';
import { CambiarClaveObligatoriaComponent } from './features/dashboard/cambiar-clave-obligatoria-component/cambiar-clave-obligatoria-component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard-equipo',
    component: DashboardEquipoComponent,
    canActivate: [equipoGuard],
  },
  {
    path: 'dashboard-admin',
    loadComponent: () =>
      import('./features/dashboard/dashboard-admin-component/dashboard-admin-component').then(
        (m) => m.DashboardAdminComponent,
      ),
    canActivate: [adminGuard],
  },
  {
    path: 'dashboard-admin/disciplinas',
    loadComponent: () =>
      import(
        './features/dashboard/dashboard-admin-component/disciplinas-component/disciplinas-component'
      ).then((m) => m.DisciplinasComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'dashboard-admin/disciplinas/:id',
    loadComponent: () =>
      import(
        './features/dashboard/dashboard-admin-component/disciplina-detalle-component/disciplina-detalle-component'
      ).then((m) => m.DisciplinaDetalleComponent),
    canActivate: [adminGuard],
  },
  {
    path: 'dashboard-municipio',
    loadComponent: () =>
      import('./features/dashboard/dashboard-municipio-component/dashboard-municipio-component').then(
        (m) => m.DashboardMunicipioComponent,
      ),
    canActivate: [municipioGuard],
  },
  {
    path: 'auth/cambiar-clave-obligatoria',
    component: CambiarClaveObligatoriaComponent,
  },
  { path: '**', redirectTo: 'login' },
];
