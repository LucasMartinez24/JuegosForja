// src/app/core/services/municipio.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MunicipioService {
  private apiUrl = `${environment.apiUrl}/municipio`;

  constructor(private http: HttpClient) {}

  private obtenerHeaders(): HttpHeaders {
    let token =
      localStorage.getItem('token') ||
      localStorage.getItem('forja_token') ||
      localStorage.getItem('jwt');

    if (!token) {
      const forjaUser = localStorage.getItem('forja_user');
      if (forjaUser) {
        try {
          const parsed = JSON.parse(forjaUser);
          token = parsed.token || parsed.jwt;
        } catch (e) {
          console.error('Error al parsear forja_user para extraer el token', e);
        }
      }
    }

    console.log('DEBUG INTERCEPTOR MANUAL: El token que va a viajar es:', token);

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol`, { headers: this.obtenerHeaders() });
  }

  obtenerTokensEmitidos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tokens`, { headers: this.obtenerHeaders() });
  }

  generarToken(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/tokens/generar`,
      {},
      { headers: this.obtenerHeaders() },
    );
  }

  dictaminarAtleta(idAtleta: string, estado: 'APROBADO' | 'RECHAZADO'): Observable<any> {
    return this.http.patch<any>(
      `${this.apiUrl}/dictamen/${idAtleta}`,
      { estado },
      { headers: this.obtenerHeaders() },
    );
  }
}
