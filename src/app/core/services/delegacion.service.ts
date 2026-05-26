import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfigEquipoPayload {
  nombreEquipo: string;
  idDisciplina: number; // 🔥 Sincronizado con la lógica macro
  usuarioId: number;
}

@Injectable({
  providedIn: 'root',
})
export class DelegacionService {
  private apiUrl = 'http://localhost:3000/api/delegacion';

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
    return this.http.get(`http://localhost:3000/api/reportes/generar?tipo=${tipo}&valor=${valor}`, {
      responseType: 'blob',
    });
  }
}
