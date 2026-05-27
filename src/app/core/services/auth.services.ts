import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((res) => {
        if (res && res.token) {
          localStorage.setItem('forja_token', res.token);
          localStorage.setItem('forja_role', res.usuario.rol);
          localStorage.setItem('forja_user', JSON.stringify(res.usuario));
        }
      }),
    );
  }

  getObtenerRol(): string | null {
    return localStorage.getItem('forja_role');
  }

  getObtenerUsuario(): any {
    const user = localStorage.getItem('forja_user');
    return user ? JSON.parse(user) : null;
  }

  estaLogueado(): boolean {
    return !!localStorage.getItem('forja_token');
  }

  logout(): void {
    localStorage.clear();
  }
}
