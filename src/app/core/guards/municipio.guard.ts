// src/core/guards/municipio.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.services';
import { toast } from 'ngx-sonner';

export const municipioGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const rol = authService.getObtenerRol();

  if (authService.estaLogueado() && rol === 'MUNICIPIO') {
    return true; // 🔓 Desbloquea la ruta
  }

  toast.error('Acceso No Autorizado', {
    description: 'Requiere credenciales institucionales de rango Municipio/Comisión.',
  });

  router.navigate(['/login']);
  return false;
};
