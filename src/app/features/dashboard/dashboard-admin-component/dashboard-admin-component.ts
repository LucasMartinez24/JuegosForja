import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../core/services/admin.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DelegacionService } from '../../../core/services/delegacion.service';

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

  // 🚀 VARIABLES DE NAVEGACIÓN POR PESTAÑAS Y HISTORIAL VISUAL DE TOKENS
  subPestanaActiva: 'auditoria' | 'listaBlanca' | 'cuentas' = 'auditoria';
  ultimosTokensGenerados: any[] = [];

  municipioForm!: FormGroup;
  procesandoMunicipioBtn = false;
  listadoLocalidadesMapeadas: any[] = [];
  listadoLocalidadesCombo: any[] = [];

  disciplinasExpandidas: { [key: string]: boolean } = {};
  municipiosExpandidos: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;
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
    this.sincronizarListaBlancaGeo();
    this.cargarLocalidadesPublicas();
  }
  localidadesProvinciales: any[] = [];
  cargarLocalidadesPublicas(): void {
    this.http.get<any[]>('http://localhost:3000/api/auth/localidades').subscribe({
      next: (res) => (this.localidadesProvinciales = res),
      error: (err) => console.error('Error al traer localidades:', err),
    });
  }
  // Changer de pestaña fluido
  cambiarSubPestana(pestana: 'auditoria' | 'listaBlanca' | 'cuentas'): void {
    this.subPestanaActiva = pestana;
    this.cdr.detectChanges();
  }

  sincronizarListaBlancaGeo(): void {
    this.adminService.obtenerLocalidadesYTokens().subscribe({
      next: (res) => {
        this.listadoLocalidadesMapeadas = res || [];
        this.listadoLocalidadesCombo = this.listadoLocalidadesMapeadas.filter(
          (l) => !l.tieneCuenta,
        );
        this.cdr.detectChanges();
      },
      error: (err) => console.error('❌ Error geográfico:', err),
    });
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
        this.sincronizarListaBlancaGeo();
      },
      error: (err) => {
        this.procesandoMunicipioBtn = false;
        toast.error('No se pudo procesar', { description: err.error?.error });
      },
    });
  }

  emitirTokenDeListaBlanca(idLocalidad: any): void {
    if (!idLocalidad) return;

    const idNumerico = parseInt(idLocalidad, 10);
    const localidadObj = this.listadoLocalidadesMapeadas.find((l) => l.id === idNumerico);

    this.adminService.generarTokenMunicipio(idNumerico).subscribe({
      next: (res) => {
        if (res && res.token) {
          navigator.clipboard.writeText(res.token.token);

          toast.success('Token Copiado', {
            description: `Clave: ${res.token.token}`,
            duration: 4000,
          });

          // 🚀 INYECCIÓN VISUAL DE HISTORIAL: Agregamos el objeto token al frente del panel lateral
          const tokenConDatosLocalidad = {
            ...res.token,
            localidad: { nombre: localidadObj ? localidadObj.nombre : 'Sede Comunal' },
          };
          this.ultimosTokensGenerados.unshift(tokenConDatosLocalidad);

          this.sincronizarListaBlancaGeo();
        }
      },
      error: (err) => console.error('❌ ERROR AL EMITIR TOKEN:', err),
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
      error: (err) => {
        this.cargando = false;
        toast.error('Error de red', { description: 'No se pudo sincronizar.' });
      },
    });
  }

  eliminarDelegacionFalsa(idEquipo: string, nombreEquipo: string): void {
    const confirmar = confirm(`⚠️ ¿Está seguro de eliminar la delegación "${nombreEquipo}"?`);
    if (!confirmar) return;

    const resguardoArbol = JSON.parse(JSON.stringify(this.disciplinas));
    this.disciplinas.forEach((disc) => {
      disc.municipios.forEach((mun: any) => {
        mun.equipos = mun.equipos.filter((eq: any) => eq.idEquipo !== idEquipo);
      });
    });
    this.cdr.detectChanges();

    this.adminService.eliminarEquipo(idEquipo).subscribe({
      next: (res) => toast.success('Delegación Eliminada', { description: res.mensaje }),
      error: (err) => {
        this.disciplinas = resguardoArbol;
        this.cdr.detectChanges();
        toast.error('Error', { description: err.error?.error });
      },
    });
  }

  descargarReporte(tipo: string, valor: any): void {
    const idValido = valor ?? (valor?.id || valor?.idDisciplina);
    if (!idValido) return;

    this.delegacionService.descargarReporte(tipo, idValido).subscribe({
      next: (blob) => this.forzarDescarga(blob, `Reporte_${tipo}_${idValido}.xlsx`),
      error: () => toast.error('Error al generar el archivo'),
    });
  }

  private forzarDescarga(blob: Blob, nombre: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    window.URL.revokeObjectURL(url);
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

      disc.totalPendientes = disc.municipios.reduce((accMun: number, m: any) => {
        return accMun + m.equipos.reduce((accEq: number, e: any) => accEq + e.atletasPendientes, 0);
      }, 0);
    });

    this.cerrarAuditoria();
    this.cdr.detectChanges();

    this.adminService.dictaminarAtleta(idAtleta, estado).subscribe({
      next: (res) => {
        toast.success(`Dictamen Procesado`, {
          description: `El atleta fue marcado como ${estado.toLowerCase()} con éxito.`,
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
