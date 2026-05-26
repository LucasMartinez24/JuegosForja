// src/app/core/services/municipio.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MunicipioService {
  private apiUrl = 'http://localhost:3000/api/municipio';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene dinámicamente las cabeceras con el JWT guardado en el Login
   */
  private obtenerHeaders(): HttpHeaders {
    // 1. Intentamos leer de las claves individuales más comunes
    let token =
      localStorage.getItem('token') ||
      localStorage.getItem('forja_token') ||
      localStorage.getItem('jwt');

    // 2. Si no aparece, intentamos extraerlo del objeto de usuario por si se guardó anidado
    if (!token) {
      const forjaUser = localStorage.getItem('forja_user');
      if (forjaUser) {
        try {
          const parsed = JSON.parse(forjaUser);
          token = parsed.token || parsed.jwt; // Buscamos si vino adentro
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

  /**
   * Trae el árbol agrupado de disciplinas y clubes del municipio
   */
  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol`, { headers: this.obtenerHeaders() });
  }

  /**
   * Trae las claves de lista blanca emitidas por esta coordinación
   */
  // src/app/core/services/municipio.service.ts

  obtenerTokensEmitidos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tokens`, { headers: this.obtenerHeaders() });
  }

  /**
   * Solicita la creación de un nuevo token para entregar a un club
   */
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
