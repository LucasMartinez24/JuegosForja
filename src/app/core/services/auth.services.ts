// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        if (res && res.token) {
          localStorage.setItem('forja_token', res.token);
          localStorage.setItem('forja_role', res.usuario.rol);
          localStorage.setItem('forja_user', JSON.stringify(res.usuario)); // <-- ¡ACÁ ESTÁ!
        }
      }),
    );
  }

  getObtenerRol(): string | null {
    return localStorage.getItem('forja_role');
  }

  estaLogueado(): boolean {
    return !!localStorage.getItem('forja_token');
  }

  logout(): void {
    localStorage.clear();
  }
}
