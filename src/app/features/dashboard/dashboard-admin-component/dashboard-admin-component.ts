// src/app/modules/admin/dashboard-admin/dashboard-admin.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../core/services/admin.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DelegacionService } from '../../../core/services/delegacion.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard-admin-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-admin-component.html',
  styleUrl: './dashboard-admin-component.css',
})
export class DashboardAdminComponent implements OnInit {
  disciplinas: any[] = [];
  cargando = true;
  procesandoDictamen = false;

  subPestanaActiva: 'auditoria' | 'cuentas' = 'auditoria';
  municipioForm!: FormGroup;
  procesandoMunicipioBtn = false;
  localidadesProvinciales: any[] = [];

  disciplinasExpandidas: { [key: string]: boolean } = {};
  municipiosExpandidos: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;

  mostrarModalDelegado = false;
  equipoSeleccionado: any = null;

  // 🚀 NUEVO: Propiedades para Modal de Confirmación Estético en Admin
  mostrarModalConfirmarEliminar = false;
  equipoParaEliminar: { idEquipo: string; nombreEquipo: string } | null = null;
  procesandoEliminacion = false;

  serverUrl = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private delegacionService: DelegacionService,
    private http: HttpClient,
  ) {
    this.serverUrl = this.adminService.serverUrl;
  }

  ngOnInit(): void {
    this.municipioForm = this.fb.group({
      idLocalidad: ['', Validators.required],
      nombreResponsante: ['', [Validators.required, Validators.minLength(3)]],
      apellidoResponsante: ['', [Validators.required, Validators.minLength(3)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.cargarMapaProvincial();
    this.cargarLocalidadesPublicas();
  }

  cargarLocalidadesPublicas(): void {
    this.http.get<any[]>(`${environment.apiUrl}/auth/localidades`).subscribe({
      next: (res) => (this.localidadesProvinciales = res),
      error: (err) => console.error('Error al traer localidades:', err),
    });
  }

  cambiarSubPestana(pestana: 'auditoria' | 'cuentas'): void {
    this.subPestanaActiva = pestana;
    this.cdr.detectChanges();
  }

  onCrearCuentaMunicipio(): void {
    if (this.municipioForm.invalid) {
      this.municipioForm.markAllAsTouched();
      return;
    }
    this.procesandoMunicipioBtn = true;
    this.adminService.crearUsuarioMunicipio(this.municipioForm.value).subscribe({
      next: (res) => {
        toast.success('Cuenta Creada', { description: res.mensaje });
        this.municipioForm.reset({ idLocalidad: '' });
        this.procesandoMunicipioBtn = false;
      },
      error: (err) => {
        this.procesandoMunicipioBtn = false;
        toast.error('No se pudo procesar', { description: err.error?.error });
      },
    });
  }

  cargarMapaProvincial(): void {
    this.cargando = true;
    this.adminService.obtenerArbolDelegaciones().subscribe({
      next: (res) => {
        this.disciplinas = res;
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        toast.error('Error de red', { description: 'No se pudo sincronizar el mapa deportivo.' });
      },
    });
  }

  // 🚀 INTERCEPTOR INTERFAZ: Levanta el modal en vez de disparar confirm() de Windows
  eliminarDelegacionFalsa(idEquipo: string, nombreEquipo: string): void {
    this.equipoParaEliminar = { idEquipo, nombreEquipo };
    this.mostrarModalConfirmarEliminar = true;
    this.cdr.detectChanges();
  }

  eliminarDesdeModalDelegado(): void {
    if (!this.equipoSeleccionado) return;

    // Guardamos los datos antes de apagar el modal
    this.equipoParaEliminar = {
      idEquipo: this.equipoSeleccionado.idEquipo,
      nombreEquipo: this.equipoSeleccionado.nombreEquipo,
    };

    this.mostrarModalDelegado = false; // 1. Cerramos el visor de DNI
    this.cdr.detectChanges(); // Forzamos limpieza inmediata

    // 🚀 SOLUCIÓN: Desplazamos la apertura al siguiente tick del ciclo de vida
    setTimeout(() => {
      this.mostrarModalConfirmarEliminar = true;
      this.cdr.detectChanges();
    }, 0);
  }

  // 🚀 ADJUDICACIÓN DE BAJA PROVINCIAL FINAL
  confirmarEliminacionEfectiva(): void {
    if (!this.equipoParaEliminar || this.procesandoEliminacion) return;
    this.procesandoEliminacion = true;

    const idTarget = this.equipoParaEliminar.idEquipo;
    const resguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));

    // Remoción optimista visual
    this.disciplinas.forEach((disc) => {
      disc.municipios.forEach((mun: any) => {
        mun.equipos = mun.equipos.filter((eq: any) => eq.idEquipo !== idTarget);
      });
    });
    this.cdr.detectChanges();

    this.adminService.eliminarEquipo(idTarget).subscribe({
      next: (res) => {
        toast.success('Delegación Eliminada', { description: res.mensaje });
        this.cerrarModalConfirmar();
      },
      error: (err) => {
        this.disciplinas = resguardoArbol; // Rollback
        this.procesandoEliminacion = false;
        this.cdr.detectChanges();
        toast.error('Error', { description: err.error?.error || 'No se pudo remover el club.' });
      },
    });
  }

  cerrarModalConfirmar(): void {
    this.mostrarModalConfirmarEliminar = false;
    this.equipoParaEliminar = null;
    this.procesandoEliminacion = false;
    this.cdr.detectChanges();
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
    const copiaResguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));

    this.disciplinas.forEach((disc) => {
      disc.municipios.forEach((mun: any) => {
        mun.equipos.forEach((eq: any) => {
          const atletaIdx = eq.atletas.findIndex((a: any) => a.id === idAtleta);
          if (atletaIdx !== -1) {
            eq.atletas[atletaIdx].estado = estado;
            eq.atletasPendientes = eq.atletas.filter((a: any) => a.estado === 'PENDIENTE').length;
          }
        });
      });
      disc.totalPendientes = disc.municipios.reduce(
        (acc: number, m: any) =>
          acc + m.equipos.reduce((a: number, e: any) => a + e.atletasPendientes, 0),
        0,
      );
    });

    this.cerrarAuditoria();
    this.cdr.detectChanges();

    this.adminService.dictaminarAtleta(idAtleta, estado).subscribe({
      next: () => {
        toast.success(`Dictamen Procesado`, {
          description: `Atleta marcado como ${estado.toLowerCase()}.`,
        });
        this.procesandoDictamen = false;
      },
      error: (err) => {
        this.procesandoDictamen = false;
        this.disciplinas = copiaResguardoArbol;
        this.cdr.detectChanges();
        toast.error('Fallo de Sincronización', { description: err.error?.error });
      },
    });
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
