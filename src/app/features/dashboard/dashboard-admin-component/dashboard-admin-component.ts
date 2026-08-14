// src/app/modules/admin/dashboard-admin/dashboard-admin.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../core/services/admin.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DelegacionService } from '../../../core/services/delegacion.service';
import { environment } from '../../../../environments/environment';
import { AgregarAtletaComponent } from './agregar-atleta-component/agregar-atleta-component';

@Component({
  selector: 'app-dashboard-admin-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, AgregarAtletaComponent],
  templateUrl: './dashboard-admin-component.html',
  styleUrl: './dashboard-admin-component.css',
})
export class DashboardAdminComponent implements OnInit {
  disciplinas: any[] = [];
  cargando = true;
  procesandoDictamen = false;

  subPestanaActiva: 'auditoria' | 'clubes' | 'atletas' | 'rama' = 'auditoria';
  localidadesProvinciales: any[] = [];

  // === Alta de Clubes (modo admin) ===
  clubForm!: FormGroup;
  procesandoClubBtn = false;
  catalogoDisciplinas: any[] = [];

  // === Vista de Equipos por Rama (pestaña dedicada por disciplina) ===
  disciplinaSeleccionada: any = null;
  cargandoEquiposPorRama = false;
  equiposPorDisciplina: any[] = [];

  disciplinasExpandidas: { [key: string]: boolean } = {};
  municipiosExpandidos: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;
  motivoRechazoInput: string = '';

  mostrarModalDelegado = false;
  equipoSeleccionado: any = null;

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
    this.clubForm = this.fb.group({
      nombreClub: ['', [Validators.required, Validators.minLength(3)]],
      idDisciplina: ['', Validators.required],
      idLocalidad: ['', Validators.required],
      nombreRepresentante: ['', [Validators.required, Validators.minLength(3)]],
      apellido: ['', [Validators.required, Validators.minLength(3)]],
      dniRepresentante: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.cargarMapaProvincial();
    this.cargarLocalidadesPublicas();
    this.cargarCatalogoDisciplinas();
  }

  cargarLocalidadesPublicas(): void {
    this.http.get<any[]>(`${environment.apiUrl}/auth/localidades`).subscribe({
      next: (res) => (this.localidadesProvinciales = res),
      error: (err) => console.error('Error al traer localidades:', err),
    });
  }

  cargarCatalogoDisciplinas(): void {
    this.adminService.obtenerCatalogoDisciplinas().subscribe({
      next: (res) => (this.catalogoDisciplinas = res),
      error: (err) => console.error('Error al traer catálogo de disciplinas:', err),
    });
  }

  cambiarSubPestana(pestana: 'auditoria' | 'clubes' | 'atletas' | 'rama'): void {
    this.subPestanaActiva = pestana;
    if (pestana !== 'rama') {
      this.disciplinaSeleccionada = null;
      this.equiposPorDisciplina = [];
    }
    this.cdr.detectChanges();
  }

  onCrearClub(): void {
    if (this.clubForm.invalid) {
      this.clubForm.markAllAsTouched();
      return;
    }
    this.procesandoClubBtn = true;
    this.adminService.crearClub(this.clubForm.value).subscribe({
      next: (res) => {
        toast.success('Club Registrado', { description: res.mensaje });
        this.clubForm.reset({
          idLocalidad: '',
          idDisciplina: '',
          nombreClub: '',
          nombreRepresentante: '',
          apellido: '',
          dniRepresentante: '',
          username: '',
          password: '',
        });
        this.procesandoClubBtn = false;
        this.cargarMapaProvincial();
      },
      error: (err) => {
        this.procesandoClubBtn = false;
        toast.error('No se pudo registrar el club', {
          description: err.error?.error,
        });
      },
    });
  }

  verEquiposPorDisciplina(disciplina: any): void {
    this.disciplinaSeleccionada = disciplina;
    this.equiposPorDisciplina = [];
    this.cargandoEquiposPorRama = true;
    this.subPestanaActiva = 'rama';
    this.cdr.detectChanges();

    this.adminService.obtenerEquiposPorRama(disciplina.idDisciplina).subscribe({
      next: (res) => {
        this.equiposPorDisciplina = res.equipos || [];
        this.cargandoEquiposPorRama = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargandoEquiposPorRama = false;
        toast.error('No se pudieron cargar los equipos', {
          description: err.error?.error,
        });
        this.cdr.detectChanges();
      },
    });
  }

  volverAlArbol(): void {
    this.cambiarSubPestana('auditoria');
  }

  get equiposFemeninos(): any[] {
    return this.equiposPorDisciplina.filter(
      (e) => e.ramaPrincipal === 'FEMENINO',
    );
  }

  get equiposMasculinos(): any[] {
    return this.equiposPorDisciplina.filter(
      (e) => e.ramaPrincipal === 'MASCULINO',
    );
  }

  get equiposMixtos(): any[] {
    return this.equiposPorDisciplina.filter(
      (e) => e.ramaPrincipal === 'MIXTO',
    );
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

  eliminarDelegacionFalsa(idEquipo: string, nombreEquipo: string): void {
    this.equipoParaEliminar = { idEquipo, nombreEquipo };
    this.mostrarModalConfirmarEliminar = true;
    this.cdr.detectChanges();
  }

  eliminarDesdeModalDelegado(): void {
    if (!this.equipoSeleccionado) return;

    this.equipoParaEliminar = {
      idEquipo: this.equipoSeleccionado.idEquipo,
      nombreEquipo: this.equipoSeleccionado.nombreEquipo,
    };

    this.mostrarModalDelegado = false;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.mostrarModalConfirmarEliminar = true;
      this.cdr.detectChanges();
    }, 0);
  }

  confirmarEliminacionEfectiva(): void {
    if (!this.equipoParaEliminar || this.procesandoEliminacion) return;
    this.procesandoEliminacion = true;

    const idTarget = this.equipoParaEliminar.idEquipo;
    const resguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));

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
        this.disciplinas = resguardoArbol;
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
    this.motivoRechazoInput = '';
    this.cdr.detectChanges();
  }

  ejecutarDictamen(estado: 'APROBADO' | 'RECHAZADO'): void {
    if (!this.atletaSeleccionado || this.procesandoDictamen) return;
    
    if (estado === 'RECHAZADO' && !this.motivoRechazoInput.trim()) {
      toast.warning('Debe ingresar un motivo para el rechazo');
      return;
    }

    this.procesandoDictamen = true;

    const idAtleta = this.atletaSeleccionado.id;
    const copiaResguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));
    
    const dictamenPayload: any = { estado };
    if (estado === 'RECHAZADO') {
      dictamenPayload.motivoRechazo = this.motivoRechazoInput.trim();
    }

    this.disciplinas.forEach((disc) => {
      disc.municipios.forEach((mun: any) => {
        mun.equipos.forEach((eq: any) => {
          const atletaIdx = eq.atletas.findIndex((a: any) => a.id === idAtleta);
          if (atletaIdx !== -1) {
            eq.atletas[atletaIdx].estado = estado;
            eq.atletas[atletaIdx].motivoRechazo = estado === 'RECHAZADO' ? dictamenPayload.motivoRechazo : null;
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

    this.adminService.dictaminarAtleta(idAtleta, dictamenPayload).subscribe({
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

  descargarExcelGeneral(): void {
    const url = `${environment.apiUrl}/reportes/generar?tipo=general`;
    window.open(url, '_blank');
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
