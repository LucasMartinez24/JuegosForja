import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../core/services/admin.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-admin-component',
  imports: [CommonModule],
  templateUrl: './dashboard-admin-component.html',
  styleUrl: './dashboard-admin-component.css',
})
export class DashboardAdminComponent implements OnInit {
  disciplinas: any[] = [];
  cargando = true;
  procesandoDictamen = false;

  // Controladores dinámicos de acordeón
  disciplinasExpandidas: { [key: string]: boolean } = {};
  municipiosExpandidos: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;
  serverUrl = '';

  constructor(
    private adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    this.serverUrl = this.adminService.serverUrl;
  }
  disciplinaSeleccionada: any = null;
  ngOnInit(): void {
    this.cargarMapaProvincial();
  }

  cargarMapaProvincial(): void {
    this.cargando = true;
    this.adminService.obtenerArbolDelegaciones().subscribe({
      next: (res) => {
        this.disciplinas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        toast.error('Error de red', { description: 'No se pudo sincronizar el servidor central.' });
      },
    });
  }

  toggleDisciplina(discNombre: string): void {
    this.disciplinasExpandidas[discNombre] = !this.disciplinasExpandidas[discNombre];
    this.cdr.detectChanges();
  }

  toggleMunicipio(munClave: string): void {
    this.municipiosExpandidos[munClave] = !this.municipiosExpandidos[munClave];
    this.cdr.detectChanges();
  }

  abrirAuditoria(atleta: any): void {
    this.atletaSeleccionado = atleta;
    this.mostrarModalAuditoria = true;
    this.cdr.detectChanges();
  }

  cerrarAuditoria(): void {
    this.mostrarModalAuditoria = false;
    this.atletaSeleccionado = null;
    this.cdr.detectChanges();
  }

  ejecutarDictamen(estado: 'APROBADO' | 'RECHAZADO'): void {
    if (!this.atletaSeleccionado || this.procesandoDictamen) return;
    this.procesandoDictamen = true;

    const idAtleta = this.atletaSeleccionado.id;

    // 1. RESPUESTA OPTIMISTA MAESTRA 🚀
    // Respaldamos el árbol completo por si el VPS o MariaDB devuelven un error de red
    const copiaResguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));

    // Mutamos el estado del jugador en caliente dentro de la estructura local de memoria
    this.disciplinas.forEach((disc) => {
      disc.municipios.forEach((mun: any) => {
        mun.equipos.forEach((eq: any) => {
          const atletaIdx = eq.atletas.findIndex((a: any) => a.id === idAtleta);

          if (atletaIdx !== -1) {
            // Modificamos el estado visual del atleta
            eq.atletas[atletaIdx].estado = estado;

            // Recalculamos en caliente los contadores de este equipo específico
            eq.atletasPendientes = eq.atletas.filter((a: any) => a.estado === 'PENDIENTE').length;
          }
        });
      });

      // Recalculamos en caliente los contadores globales de la Disciplina macro
      disc.totalPendientes = disc.municipios.reduce((accMun: number, m: any) => {
        return accMun + m.equipos.reduce((accEq: number, e: any) => accEq + e.atletasPendientes, 0);
      }, 0);
    });

    // Cerramos el modal compacto y liberamos la UI inmediatamente ante los ojos del auditor
    this.cerrarAuditoria();
    this.cdr.detectChanges();

    // 2. DESPACHO EN SEGUNDO PLANO AL SERVIDOR CENTRAL 🌍
    this.adminService.dictaminarAtleta(idAtleta, estado).subscribe({
      next: (res) => {
        toast.success(`Dictamen Procesado`, {
          description: `El atleta fue marcado como ${estado.toLowerCase()} de forma definitiva.`,
        });
        this.procesandoDictamen = false;

        // Opcional: Podés descomentar la línea de abajo si querés re-sincronizar milimétricamente con el backend,
        // pero gracias a la mutación optimista de arriba, ya no es estrictamente necesario hacer el fetch de red.
        // this.cargarMapaProvincial();
      },
      error: (err) => {
        this.procesandoDictamen = false;
        console.error('❌ Error crítico al dictaminar en MariaDB. Revirtiendo árbol...', err);

        // REVERSIÓN DE EMERGENCIA: Si el servidor falla (ej. caída de conexión), restauramos todo a como estaba
        this.disciplinas = copiaResguardoArbol;
        this.cdr.detectChanges();

        toast.error('Fallo de Sincronización', {
          description:
            err.error?.error || 'No se pudo impactar el cambio. Ficha restaurada a PENDIENTE.',
        });
      },
    });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
