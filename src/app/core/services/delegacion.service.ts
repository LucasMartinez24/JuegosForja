import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConfigEquipoPayload {
  nombreEquipo: string;
  idDisciplina: number;
  usuarioId: number;
}

@Injectable({
  providedIn: 'root',
})
export class DelegacionService {
  private apiUrl = `${environment.apiUrl}/delegacion`;
  private reportesUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  obtenerEstadoPanel(usuarioId: number): Observable<any> {
    const params = new HttpParams().set('usuarioId', usuarioId.toString());
    return this.http.get<any>(`${this.apiUrl}/estado-panel`, { params });
  }

  registrarEquipo(payload: ConfigEquipoPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registrar-equipo`, payload);
  }

  registrarJugador(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registrar-jugador`, payload);
  }

  editarJugador(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/editar-jugador/${id}`, payload);
  }

  eliminarJugador(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminar-jugador/${id}`);
  }

  descargarReporte(tipo: string, valor: any): Observable<Blob> {
    return this.http.get(`${this.reportesUrl}/generar?tipo=${tipo}&valor=${valor}`, {
      responseType: 'blob',
    });
  }
}
