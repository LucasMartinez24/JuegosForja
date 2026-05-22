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

  dictaminarAtleta(id: string, estado: 'APROBADO' | 'RECHAZADO'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/dictaminar-atleta/${id}`, { estado });
  }
}
