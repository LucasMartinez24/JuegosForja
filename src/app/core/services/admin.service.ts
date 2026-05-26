// src/app/core/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/admin';
  // Ruta base para renderizar las imágenes/PDFs desde el backend
  public serverUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol-delegaciones`);
  }

  // En tu admin.service.ts
  dictaminarAtleta(idAtleta: number, estado: string): Observable<any> {
    // ¿Tu backend espera el ID en la URL o en el cuerpo?
    // Si en Express pusiste /api/admin/dictaminar/:id, usa esta URL:
    return this.http.put(`${this.serverUrl}/api/admin/dictaminar/${idAtleta}`, { estado });
  }
  eliminarEquipo(idEquipo: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminar-equipo/${idEquipo}`);
  }
  obtenerLocalidadesYTokens(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/localidades-tokens`);
  }

  crearUsuarioMunicipio(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-municipio-usuario`, payload);
  }

  generarTokenMunicipio(idLocalidad: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generar-token`, { idLocalidad });
  }
}
