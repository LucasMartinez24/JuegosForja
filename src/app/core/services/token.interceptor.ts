// src/app/core/services/token.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // Si tenemos un token guardado del login, lo clonamos en los headers de la petición
  if (token) {
    const clonada = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(clonada);
  }

  return next(req);
};
