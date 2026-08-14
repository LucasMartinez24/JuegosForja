// src/app/core/services/admin.service.ts
//
// Service único para todas las llamadas al panel /api/admin.
// El JWT lo inyecta automáticamente el tokenInterceptor configurado en
// app.config.ts, así que acá NO se arman headers a mano.
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

  // =========================================================================
  // Árbol ministerial y delegaciones
  // =========================================================================
  obtenerArbolDelegaciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/arbol-delegaciones`);
  }

  obtenerDelegadoPorEquipo(idEquipo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/equipo-delegado/${idEquipo}`);
  }

  // =========================================================================
  // Dictámenes y baja de equipos
  // =========================================================================
  dictaminarAtleta(idAtleta: string, payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/dictaminar/${idAtleta}`, payload);
  }

  eliminarEquipo(idEquipo: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminar-equipo/${idEquipo}`);
  }

  // =========================================================================
  // Cuentas municipales (lista blanca + token)
  // =========================================================================
  obtenerLocalidadesYTokens(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/localidades-tokens`);
  }

  crearUsuarioMunicipio(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-municipio-usuario`, payload);
  }

  generarTokenMunicipio(idLocalidad: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generar-token`, { idLocalidad });
  }

  // =========================================================================
  // Alta de clubes (admin crea club + usuario + disciplina en una sola tx)
  // =========================================================================
  crearClub(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/crear-club`, payload);
  }

  // =========================================================================
  // Disciplinas y catálogo
  // =========================================================================
  obtenerCatalogoDisciplinas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/disciplinas`);
  }

  obtenerEquiposPorRama(idDisciplina: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/equipos-por-rama/${idDisciplina}`);
  }

  // =========================================================================
  // 🚀 NUEVO: Alta de atletas por parte del ADMIN (flujo pedido)
  // =========================================================================
  listarEquiposDisponibles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/equipos-disponibles`);
  }

  obtenerPruebasPorDisciplina(idDisciplina: number): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/pruebas-por-disciplina/${idDisciplina}`,
    );
  }

  agregarAtletaAEquipo(idEquipo: string, formData: FormData): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/agregar-atleta/${idEquipo}`,
      formData,
    );
  }
}