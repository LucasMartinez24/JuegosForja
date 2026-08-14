import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../../core/services/admin.service';
import { EditarAtletaModalComponent } from '../editar-atleta-modal-component/editar-atleta-modal-component';

/**
 * Vista de DETALLE de una disciplina: al seleccionar un deporte en el catálogo,
 * se navega a esta página (`/dashboard-admin/disciplinas/:id`) donde se listan
 * todos los equipos pertenecientes a esa disciplina, agrupados por rama
 * (Femenina / Masculina / Mixta).
 *
 * Desde cada equipo se puede expandir su nómina de atletas y dictaminar
 * (aprobar/rechazar) directamente con el sub-modal de evaluación documental.
 */
@Component({
  selector: 'app-disciplina-detalle-component',
  standalone: true,
  imports: [CommonModule, FormsModule, EditarAtletaModalComponent],
  templateUrl: './disciplina-detalle-component.html',
  styleUrl: './disciplina-detalle-component.css',
})
export class DisciplinaDetalleComponent implements OnInit {
  cargando = true;

  disciplinaSeleccionada: any = null;
  equipos: any[] = [];
  ramaActiva: string = 'FEMENINO';
  busquedaEquipo: string = '';

  mostrarModalEquipo = false;
  equipoSeleccionado: any = null;

  mostrarModalDictamen = false;
  atletaSeleccionado: any = null;
  motivoRechazoInput: string = '';
  procesandoDictamen = false;

  atletaParaEditar: any = null;
  contextoEdicionAtleta: any = null;
  mostrarModalConfirmarEliminarAtleta = false;
  atletaParaEliminar: any = null;
  procesandoEliminacionAtleta = false;

  constructor(
    private adminService: AdminService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.volverAlCatalogo();
      return;
    }
    this.cargarDetalle(+id);
  }

  cargarDetalle(id: number): void {
    this.cargando = true;
    this.adminService.obtenerEquiposPorRama(id).subscribe({
      next: (res) => {
        this.disciplinaSeleccionada = res?.disciplina || { id, nombre: 'Disciplina' };
        this.equipos = res?.equipos || [];
        const orden = ['FEMENINO', 'MASCULINO', 'MIXTO'];
        const primeraConEquipos = orden.find((key) => {
          const lista =
            key === 'FEMENINO'
              ? this.equiposFemeninos
              : key === 'MASCULINO'
                ? this.equiposMasculinos
                : this.equiposMixtos;
          return lista.length > 0;
        });
        this.ramaActiva = primeraConEquipos || 'FEMENINO';
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        toast.error('No se pudo obtener el desglose por rama.');
        this.cdr.detectChanges();
      },
    });
  }

  volverAlCatalogo(): void {
    this.router.navigate(['/dashboard-admin/disciplinas']);
  }

  volver(): void {
    this.router.navigate(['/dashboard-admin']);
  }

  seleccionarRama(key: string): void {
    this.ramaActiva = key;
    this.cdr.detectChanges();
  }

  actualizarBusqueda(): void {
    const orden = ['FEMENINO', 'MASCULINO', 'MIXTO'];
    const primeraConEquipos = orden.find((key) => {
      const lista =
        key === 'FEMENINO'
          ? this.equiposFemeninos
          : key === 'MASCULINO'
            ? this.equiposMasculinos
            : this.equiposMixtos;
      return lista.length > 0;
    });
    if (primeraConEquipos) {
      this.ramaActiva = primeraConEquipos;
    }
    this.cdr.detectChanges();
  }

  limpiarBusqueda(): void {
    this.busquedaEquipo = '';
    this.actualizarBusqueda();
  }

  seleccionarEquipoSelect(event: any): void {
    const id = Number(event.target.value);
    event.target.value = '';
    if (!id) return;
    const eq = this.equipos.find((e) => e.idEquipo === id);
    if (eq) {
      this.abrirEquipo(eq);
    }
  }

  abrirEquipo(eq: any): void {
    this.equipoSeleccionado = eq;
    this.mostrarModalEquipo = true;
    this.cdr.detectChanges();
  }

  cerrarEquipo(): void {
    this.mostrarModalEquipo = false;
    this.equipoSeleccionado = null;
    this.cdr.detectChanges();
  }

  abrirDictamen(atleta: any): void {
    this.atletaSeleccionado = atleta;
    this.motivoRechazoInput = '';
    this.mostrarModalDictamen = true;
    this.cdr.detectChanges();
  }

  cerrarDictamen(): void {
    this.mostrarModalDictamen = false;
    this.atletaSeleccionado = null;
    this.motivoRechazoInput = '';
    this.cdr.detectChanges();
  }

  abrirEditarAtleta(atleta: any): void {
    this.atletaParaEditar = atleta;
    this.contextoEdicionAtleta = {
      disciplina: this.equipoSeleccionado?.disciplina || '',
      equipo: this.equipoSeleccionado?.nombreEquipo || '',
    };
    this.cdr.detectChanges();
  }

  cerrarEditarAtleta(): void {
    this.atletaParaEditar = null;
    this.contextoEdicionAtleta = null;
    this.cdr.detectChanges();
  }

  onAtletaActualizado(atleta: any): void {
    this.cerrarEditarAtleta();
    this.cerrarEquipo();
    const id = this.disciplinaSeleccionada?.id;
    if (id) this.cargarDetalle(id);
  }

  confirmarEliminarAtleta(atleta: any): void {
    this.atletaParaEliminar = atleta;
    this.mostrarModalConfirmarEliminarAtleta = true;
    this.cdr.detectChanges();
  }

  cerrarModalConfirmarAtleta(): void {
    this.mostrarModalConfirmarEliminarAtleta = false;
    this.atletaParaEliminar = null;
    this.procesandoEliminacionAtleta = false;
    this.cdr.detectChanges();
  }

  ejecutarEliminacionAtleta(): void {
    if (!this.atletaParaEliminar || this.procesandoEliminacionAtleta) return;
    this.procesandoEliminacionAtleta = true;

    const idAtleta = this.atletaParaEliminar.id;
    const resguardo = JSON.parse(JSON.stringify(this.equipos));

    this.equipos.forEach((eq: any) => {
      if (eq.atletas) {
        eq.atletas = eq.atletas.filter((a: any) => a.id !== idAtleta);
      }
    });
    this.actualizarContadores();
    this.cdr.detectChanges();

    this.adminService.eliminarAtleta(idAtleta).subscribe({
      next: (res) => {
        this.procesandoEliminacionAtleta = false;
        this.cerrarModalConfirmarAtleta();
        this.cerrarEquipo();
        toast.success('Atleta eliminado', { description: res.mensaje });
        const id = this.disciplinaSeleccionada?.id;
        if (id) this.cargarDetalle(id);
      },
      error: (err) => {
        this.procesandoEliminacionAtleta = false;
        this.equipos = resguardo;
        this.cdr.detectChanges();
        toast.error('Error', {
          description: err.error?.error || 'No se pudo eliminar el atleta.',
        });
      },
    });
  }

  ejecutarDictamen(estado: 'APROBADO' | 'RECHAZADO'): void {
    if (!this.atletaSeleccionado || this.procesandoDictamen) return;

    if (estado === 'RECHAZADO' && !this.motivoRechazoInput.trim()) {
      toast.warning('Debe ingresar un motivo para el rechazo');
      return;
    }

    this.procesandoDictamen = true;

    const idAtleta = this.atletaSeleccionado.id;
    const copiaResguardo = JSON.parse(JSON.stringify(this.equipos));

    const dictamenPayload: any = { estado };
    if (estado === 'RECHAZADO') {
      dictamenPayload.motivoRechazo = this.motivoRechazoInput.trim();
    }

    const atletaEnMemoria = this.equipos
      .flatMap((eq) => eq.atletas || [])
      .find((a: any) => a.id === idAtleta);

    if (atletaEnMemoria) {
      atletaEnMemoria.estado = estado;
      atletaEnMemoria.motivoRechazo =
        estado === 'RECHAZADO' ? dictamenPayload.motivoRechazo : null;
    }

    this.actualizarContadores();
    this.cerrarDictamen();
    this.cdr.detectChanges();

    this.adminService.dictaminarAtleta(idAtleta, dictamenPayload).subscribe({
      next: () => {
        this.procesandoDictamen = false;
        toast.success('Dictamen Procesado', {
          description: `Atleta marcado como ${estado.toLowerCase()}.`,
        });
      },
      error: (err) => {
        this.procesandoDictamen = false;
        this.equipos = copiaResguardo;
        this.cdr.detectChanges();
        toast.error('Fallo de Sincronización', { description: err.error?.error });
      },
    });
  }

  actualizarContadores(): void {
    this.equipos.forEach((eq: any) => {
      const atletas = eq.atletas || [];
      eq.atletasPendientes = atletas.filter((a: any) => a.estado === 'PENDIENTE').length;
      eq.atletasAprobados = atletas.filter((a: any) => a.estado === 'APROBADO').length;
      eq.atletasRechazados = atletas.filter((a: any) => a.estado === 'RECHAZADO').length;
    });
  }

  get equiposFiltrados(): any[] {
    const term = this.busquedaEquipo.trim().toLowerCase();
    if (!term) return this.equipos;
    return this.equipos.filter((e) =>
      [
        e.nombreEquipo,
        e.siglas,
        e.localidadNombre,
        e.municipio,
        e.representante,
        e.usernameRepresentante,
        e.dniRepresentante,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  get equiposOrdenados(): any[] {
    return [...this.equipos].sort((a, b) =>
      (a.nombreEquipo || '').localeCompare(b.nombreEquipo || ''),
    );
  }

  get equiposFemeninos(): any[] {
    return this.equiposFiltrados.filter((e) => e.ramaPrincipal === 'FEMENINO');
  }

  get equiposMasculinos(): any[] {
    return this.equiposFiltrados.filter((e) => e.ramaPrincipal === 'MASCULINO');
  }

  get equiposMixtos(): any[] {
    return this.equiposFiltrados.filter((e) => e.ramaPrincipal === 'MIXTO');
  }

  get ramasDisponibles(): any[] {
    const ramas: any[] = [
      {
        key: 'FEMENINO',
        titulo: 'Rama Femenina',
        icono: 'female',
        cantidad: this.equiposFemeninos.length,
      },
      {
        key: 'MASCULINO',
        titulo: 'Rama Masculina',
        icono: 'male',
        cantidad: this.equiposMasculinos.length,
      },
    ];
    if (this.equiposMixtos.length > 0) {
      ramas.push({
        key: 'MIXTO',
        titulo: 'Rama Mixta',
        icono: 'transgender',
        cantidad: this.equiposMixtos.length,
      });
    }
    return ramas;
  }

  get bloqueActivo(): any {
    const rama = this.ramasDisponibles.find((r) => r.key === this.ramaActiva);
    const activa = rama || this.ramasDisponibles[0];
    const lista =
      activa.key === 'FEMENINO'
        ? this.equiposFemeninos
        : activa.key === 'MASCULINO'
          ? this.equiposMasculinos
          : this.equiposMixtos;
    return { ...activa, equipos: lista };
  }
}
