// src/app/modules/municipio/dashboard-municipio/dashboard-municipio.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toast } from 'ngx-sonner';
import { MunicipioService } from '../../../core/services/municipio.service';
import { AuthService } from '../../../core/services/auth.services';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-dashboard-municipio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-municipio-component.html',
  styleUrl: './dashboard-municipio-component.css',
})
export class DashboardMunicipioComponent implements OnInit {
  nombreMunicipioSesion = '';
  cargando = true;
  procesandoDictamen = false;

  disciplinas: any[] = [];
  disciplinasExpandidas: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;

  mostrarModalDelegado = false;
  equipoSeleccionado: any = null;

  // 🚀 NUEVO: Control de Modal de Confirmación Estético
  mostrarModalConfirmarEliminar = false;
  equipoParaEliminar: { idEquipo: string; nombreEquipo: string } | null = null;
  procesandoEliminacion = false;

  constructor(
    private municipioService: MunicipioService,
    private adminService: AdminService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.inicializarSesion();
    this.cargarPanelMunicipal();
  }

  private inicializarSesion(): void {
    const usuario = this.authService.getObtenerUsuario();
    if (usuario) {
      this.nombreMunicipioSesion = usuario.localidadNombre?.toUpperCase() || 'COORDINACIÓN LOCAL';
    } else {
      this.router.navigate(['/login']);
    }
  }

  cargarPanelMunicipal(): void {
    this.cargando = true;
    this.municipioService.obtenerArbolDelegaciones().subscribe({
      next: (res) => {
        this.disciplinas = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        toast.error('Error de red', { description: 'No se pudo sincronizar las listas.' });
        this.cdr.detectChanges();
      },
    });
  }

  abrirAuditoriaDelegado(equipo: any): void {
    this.equipoSeleccionado = {
      idEquipo: equipo.idEquipo,
      nombreEquipo: equipo.nombreEquipo,
      usuarioResponsable: null,
    };
    this.mostrarModalDelegado = true;
    this.cdr.detectChanges();

    this.adminService.obtenerDelegadoPorEquipo(equipo.idEquipo).subscribe({
      next: (res) => {
        this.equipoSeleccionado.usuarioResponsable = res.usuarioResponsable;
        this.cdr.detectChanges();
      },
      error: (err) => {
        toast.error('Ficha no disponible', { description: err.error?.error });
      },
    });
  }

  cerrarAuditoriaDelegado(): void {
    this.mostrarModalDelegado = false;
    this.equipoSeleccionado = null;
    this.cdr.detectChanges();
  }

  // 🚀 INTERCEPTOR: En vez de confirm(), levanta nuestro modal cyberpunk de peligro
  eliminarDesdeModalDelegado(): void {
    if (!this.equipoSeleccionado) return;

    this.equipoParaEliminar = {
      idEquipo: this.equipoSeleccionado.idEquipo,
      nombreEquipo: this.equipoSeleccionado.nombreEquipo,
    };

    this.mostrarModalDelegado = false; // 1. Cerramos el visor de DNI
    this.cdr.detectChanges();

    // 🚀 SOLUCIÓN: Separamos los contextos de renderizado
    setTimeout(() => {
      this.mostrarModalConfirmarEliminar = true;
      this.cdr.detectChanges();
    }, 0);
  }

  // 🚀 EJECUCIÓN FINAL DE PURGA MUNICIPAL
  confirmarEliminacionEfectiva(): void {
    if (!this.equipoParaEliminar || this.procesandoEliminacion) return;
    this.procesandoEliminacion = true;

    this.adminService.eliminarEquipo(this.equipoParaEliminar.idEquipo).subscribe({
      next: (res) => {
        toast.success('Delegación Purgada', { description: res.mensaje });
        this.cerrarModalConfirmar();
        this.cargarPanelMunicipal();
      },
      error: (err) => {
        this.procesandoEliminacion = false;
        toast.error('Error operativo', { description: err.error?.error || 'No se pudo borrar.' });
      },
    });
  }

  cerrarModalConfirmar(): void {
    this.mostrarModalConfirmarEliminar = false;
    this.equipoParaEliminar = null;
    this.procesandoEliminacion = false;
    this.cdr.detectChanges();
  }

  ejecutarDictamen(estado: 'APROBADO' | 'RECHAZADO'): void {
    if (!this.atletaSeleccionado || this.procesandoDictamen) return;
    this.procesandoDictamen = true;

    this.municipioService.dictaminarAtleta(this.atletaSeleccionado.id, estado).subscribe({
      next: () => {
        this.mostrarModalAuditoria = false;
        this.atletaSeleccionado = null;
        this.procesandoDictamen = false;
        toast.success(`Ficha médica evaluada`, { description: `Estado: ${estado}.` });
        this.cargarPanelMunicipal();
      },
      error: (err) => {
        this.procesandoDictamen = false;
        toast.error('Error al guardar dictamen', { description: err.error?.error });
        this.cdr.detectChanges();
      },
    });
  }

  toggleDisciplina(nombreDisciplina: string): void {
    this.disciplinasExpandidas[nombreDisciplina] = !this.disciplinasExpandidas[nombreDisciplina];
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

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
