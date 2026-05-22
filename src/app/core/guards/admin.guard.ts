// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toast } from 'ngx-sonner';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const usuarioString = localStorage.getItem('forja_user');

  if (!usuarioString) {
    toast.error('Acceso Denegado', { description: 'Debe iniciar sesión para auditar planillas.' });
    router.navigate(['/login']);
    return false;
  }

  try {
    const usuarioLogueado = JSON.parse(usuarioString);

    // 🚀 CONTROL RIGUROSO DE ROL MINISTERIAL
    if (usuarioLogueado.rol === 'ADMIN') {
      return true;
    }

    // Si el rol es EQUIPO o MUNICIPIO, lo rebotamos a su entorno correspondiente
    toast.error('Permisos Insuficientes', {
      description:
        'Esta sección está reservada exclusivamente para auditores del Ministerio de Deportes.',
    });
    router.navigate(['/dashboard-equipo']);
    return false;
  } catch (error) {
    localStorage.clear();
    router.navigate(['/login']);
    return false;
  }
};
