// src/app/core/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;
  public serverUrl = environment.serverUrl;

  constructor(private http: HttpClient) {}

  // 🚀 INTERCEPTOR MANUAL: Extrae el JWT guardado en el login para abrir los endpoints de administración
  private obtenerHeaders(): HttpHeaders {
    let token = localStorage.getItem('token') || localStorage.getItem('jwt');

    if (!token) {
      const forjaUser = localStorage.getItem('forja_user');
      if (forjaUser) {
        try {
          const parsed = JSON.parse(forjaUser);
          token = parsed.token || parsed.jwt;
        } catch (e) {
          console.error('Error al extraer token desde forja_user en AdminService', e);
        }
      }
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // 🚀 NUEVA PETICIÓN: Trae la documentación y datos del DNI del representante de forma aislada
  obtenerDelegadoPorEquipo(idEquipo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/equipo-delegado/${idEquipo}`, {
      headers: this.obtenerHeaders(),
    });
  }

  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol-delegaciones`, {
      headers: this.obtenerHeaders(),
    });
  }

  dictaminarAtleta(idAtleta: number, estado: string): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/dictaminar/${idAtleta}`,
      { estado },
      { headers: this.obtenerHeaders() },
    );
  }

  eliminarEquipo(idEquipo: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminar-equipo/${idEquipo}`, {
      headers: this.obtenerHeaders(),
    });
  }

  crearUsuarioMunicipio(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-municipio-usuario`, payload, {
      headers: this.obtenerHeaders(),
    });
  }

  // =========================================================================
  // MÉTODOS DE RESERVA / LEGADO (Saneados con Headers por si los usás en otro módulo)
  // =========================================================================
  obtenerLocalidadesYTokens(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/localidades-tokens`, {
      headers: this.obtenerHeaders(),
    });
  }

  generarTokenMunicipio(idLocalidad: number): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/generar-token`,
      { idLocalidad },
      { headers: this.obtenerHeaders() },
    );
  }
}
