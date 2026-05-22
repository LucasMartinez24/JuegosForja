import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login-component/login-component';
import { DashboardEquipoComponent } from './features/dashboard/dashboard-equipo-component/dashboard-equipo-component';
import { equipoGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: 'dashboard-equipo',
    component: DashboardEquipoComponent,
    canActivate: [equipoGuard], // <-- Protegido: Solo entran delegados de equipos logueados
  },
  {
    path: 'dashboard-admin',
    loadComponent: () =>
      import('./features/dashboard/dashboard-admin-component/dashboard-admin-component').then(
        (m) => m.DashboardAdminComponent,
      ),
    canActivate: [adminGuard], // 🔒 Blindado contra accesos no autorizados
  },
  { path: '**', redirectTo: 'login' },
];
