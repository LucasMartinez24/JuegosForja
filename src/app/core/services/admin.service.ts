// src/app/core/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;
  public serverUrl = environment.serverUrl;

  constructor(private http: HttpClient) {}

  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol-delegaciones`);
  }

  dictaminarAtleta(idAtleta: number, estado: string): Observable<any> {
    return this.http.put(`${environment.apiUrl}/admin/dictaminar/${idAtleta}`, {
      estado,
    });
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
