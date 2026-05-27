// src/app/modules/municipio/dashboard-municipio/dashboard-municipio.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toast } from 'ngx-sonner';
import { MunicipioService } from '../../../core/services/municipio.service';
import { AuthService } from '../../../core/services/auth.services';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard-municipio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-municipio-component.html',
  styleUrl: './dashboard-municipio-component.css',
})
export class DashboardMunicipioComponent implements OnInit {
  nombreMunicipioSesion = '';
  serverUrl = environment.serverUrl; // 🚀 CORREGIDO: Declarado para renderizar las URLs de DNI y PDF

  subPestanaActiva: 'auditoria' | 'listaBlanca' = 'auditoria';
  cargando = true;
  procesandoBoton = false;
  procesandoDictamen = false; // 🚀 CORREGIDO: Bandera de carga para los botones del modal

  disciplinas: any[] = [];
  ultimosTokensGenerados: any[] = [];
  disciplinasExpandidas: { [key: string]: boolean } = {};

  mostrarModalAuditoria = false;
  atletaSeleccionado: any = null;

  constructor(
    private municipioService: MunicipioService,
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
      console.warn('⚠️ Sesión inválida detectada en el panel municipal.');
      this.router.navigate(['/login']);
    }
  }

  cargarPanelMunicipal(): void {
    this.cargando = true;

    this.municipioService.obtenerArbolDelegaciones().subscribe({
      next: (res) => {
        setTimeout(() => {
          this.disciplinas = res || [];
          this.cargando = false;
          this.cdr.detectChanges();
        }, 0);
      },
      error: () => {
        this.cargando = false;
        toast.error('Error de red', {
          description: 'No se pudo sincronizar las listas de buena fe.',
        });
        this.cdr.detectChanges();
      },
    });

    this.municipioService.obtenerTokensEmitidos().subscribe({
      next: (res) => {
        setTimeout(() => {
          this.ultimosTokensGenerados = res || [];
          this.cdr.detectChanges();
        }, 0);
      },
      error: (err) => console.error('❌ Error al recuperar pool de claves:', err),
    });
  }

  cambiarSubPestana(pestana: 'auditoria' | 'listaBlanca'): void {
    this.subPestanaActiva = pestana;
    this.cdr.detectChanges();
  }

  emitirToken(): void {
    if (this.procesandoBoton) return;
    this.procesandoBoton = true;

    this.municipioService.generarToken().subscribe({
      next: (nuevoToken) => {
        this.procesandoBoton = false;
        if (nuevoToken && nuevoToken.token) {
          navigator.clipboard.writeText(nuevoToken.token);
          toast.success('Token Emitido', {
            description: `Código ${nuevoToken.token} copiado al portapapeles.`,
            duration: 4000,
          });

          this.ultimosTokensGenerados.unshift(nuevoToken);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.procesandoBoton = false;
        toast.error('Error en canal de firmas', {
          description: err.error?.error || 'No se pudo generar.',
        });
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * 🚀 NUEVO MÉTODO: Ejecuta la aprobación o rechazo de la ficha médica desde el modal
   */
  /**
   * Ejecuta la aprobación o rechazo de la ficha médica desde el modal
   */
  ejecutarDictamen(estado: 'APROBADO' | 'RECHAZADO'): void {
    if (!this.atletaSeleccionado || this.procesandoDictamen) return;
    this.procesandoDictamen = true;

    // Guardamos el ID antes de cerrar para la petición
    const idAtleta = this.atletaSeleccionado.id;

    this.municipioService.dictaminarAtleta(idAtleta, estado).subscribe({
      next: (res) => {
        // 🚀 OPTIMIZACIÓN: Cerramos el modal inmediatamente aquí
        this.mostrarModalAuditoria = false;
        this.atletaSeleccionado = null;
        this.procesandoDictamen = false;

        toast.success(`Ficha médica evaluada`, {
          description: `El deportista quedó en estado: ${estado}.`,
        });

        // Refrescamos el panel para actualizar los contadores del árbol
        this.cargarPanelMunicipal();
      },
      error: (err) => {
        this.procesandoDictamen = false;
        toast.error('Error al procesar dictamen', {
          description: err.error?.error || 'No se pudo guardar la resolución.',
        });
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
