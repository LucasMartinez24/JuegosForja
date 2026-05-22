// src/app/core/services/delegacion.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfigEquipoPayload {
  nombreEquipo: string;
  idPrueba: number;
  usuarioId: number;
}

// Conservamos esta interfaz por si la usás en otro flujo de control,
// pero ya no limitará el transporte de archivos binarios.
export interface JugadorPayload {
  dni: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  genero: string;
}

@Injectable({
  providedIn: 'root',
})
export class DelegacionService {
  private apiUrl = 'http://localhost:3000/api/delegacion';

  constructor(private http: HttpClient) {}

  /**
   * 1. Sincronizar Estado del Panel
   */
  obtenerEstadoPanel(usuarioId: number): Observable<any> {
    const params = new HttpParams().set('usuarioId', usuarioId.toString());
    return this.http.get<any>(`${this.apiUrl}/estado-panel`, { params });
  }

  /**
   * 2. Registrar/Vincular la Disciplina (Estado A del Wizard)
   */
  registrarEquipo(payload: ConfigEquipoPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registrar-equipo`, payload);
  }

  /**
   * 3. Inscribir Atleta (Estado B del Panel)
   * CORREGIDO 🚀: Ahora acepta "FormData" de manera nativa para soportar la
   * transferencia multipart con las imágenes del DNI y el PDF de la Ficha Médica.
   */
  registrarJugador(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/registrar-jugador`, payload);
  }
  editarJugador(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/editar-jugador/${id}`, payload);
  }

  /**
   * 5. Eliminar atleta del roster y limpiar disco duro
   */
  eliminarJugador(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/eliminar-jugador/${id}`);
  }
}
