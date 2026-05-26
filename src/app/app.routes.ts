import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login-component/login-component';
import { DashboardEquipoComponent } from './features/dashboard/dashboard-equipo-component/dashboard-equipo-component';
import { equipoGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { municipioGuard } from './core/guards/municipio.guard'; // <-- 🚀 Importamos el nuevo Guard

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
  // 🚀 NUEVA RUTA INSTITUCIONAL BLINDADA CONTRA ACCESOS MALICIOSOS
  {
    path: 'dashboard-municipio',
    loadComponent: () =>
      import('./features/dashboard/dashboard-municipio-component/dashboard-municipio-component').then(
        (m) => m.DashboardMunicipioComponent, // (Creamos este componente en el siguiente paso)
      ),
    canActivate: [municipioGuard],
  },
  { path: '**', redirectTo: 'login' },
];
