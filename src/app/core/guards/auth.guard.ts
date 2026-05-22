// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.services';

export const equipoGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaLogueado() && authService.getObtenerRol() === 'EQUIPO') {
    return true; // Acceso permitido
  }

  // Si no es equipo o no está logueado, rebota al login
  router.navigate(['/login']);
  return false;
};
