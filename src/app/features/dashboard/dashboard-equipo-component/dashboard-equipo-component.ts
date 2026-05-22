import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { DelegacionService } from '../../../core/services/delegacion.service';

@Component({
  selector: 'app-dashboard-equipo-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-equipo-component.html',
  styleUrl: './dashboard-equipo-component.css',
})
export class DashboardEquipoComponent implements OnInit {
  tieneEquipoConfigurado = false;
  mostrarFormularioJugador = false;
  procesandoBoton = false;

  // 👇 NUEVAS VARIABLES PARA EL MODAL DE CONFIRMACIÓN PREMIUM
  mostrarModalConfirmarBorrar = false;
  idJugadorABorrar: string | null = null;
  nombreJugadorABorrar = '';

  modoEdicion = false;
  idJugadorEdicion: string | null = null;

  configEquipoForm!: FormGroup;
  jugadorForm!: FormGroup;

  pruebasDisponibles: any[] = [];
  pruebasFiltradas: any[] = [];
  equipoData: any = null;
  jugadores: any[] = [];

  nombrePruebaActiva = '';
  maxJugadoresPermitidos = 0;
  jugadoresInscriptosCount = 0;
  cuposRestantes = 0;

  esAtletismo = false;
  esDeporteCombate = false;

  fileDniFrente: File | null = null;
  fileDniDorso: File | null = null;
  fileFichaMedica: File | null = null;

  constructor(
    private fb: FormBuilder,
    private delegacionService: DelegacionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.configEquipoForm = this.fb.group({
      nombreEquipo: ['', [Validators.required, Validators.minLength(3)]],
      idPrueba: ['', Validators.required],
    });

    this.jugadorForm = this.fb.group({
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      peso: [''],
      altura: [''],
      idPrueba1: ['', Validators.required],
      idPrueba2: [''],
    });

    this.sincronizarEstadoPanel();
  }

  sincronizarEstadoPanel(): void {
    const usuarioString = localStorage.getItem('forja_user');

    if (!usuarioString) {
      toast.error('Sesión no encontrada', { description: 'Reautenticando...' });
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }

    try {
      const usuarioLogueado = JSON.parse(usuarioString);
      const userId = usuarioLogueado.id;

      this.delegacionService.obtenerEstadoPanel(userId).subscribe({
        next: (res) => {
          this.pruebasDisponibles = res.pruebasDisponibles || [];

          if (res.equipoCargado) {
            this.equipoData = res.equipoCargado;
            this.jugadores = res.equipoCargado.jugadores || [];

            const pruebaAsignada = res.equipoCargado.pruebaEspecifica;
            if (pruebaAsignada) {
              this.nombrePruebaActiva = pruebaAsignada.nombrePrueba;
              this.maxJugadoresPermitidos = pruebaAsignada.maxJugadores;
            }

            this.tieneEquipoConfigurado = true;
            this.recalcularContadores();

            const deporte = this.equipoData?.disciplina?.nombre?.toUpperCase() || '';
            this.esAtletismo = deporte.includes('ATLETISMO');
            this.esDeporteCombate = ['BOXEO', 'LEVANTAMIENTO', 'JUDO', 'LUCHA'].some((d) =>
              deporte.includes(d),
            );

            this.pruebasFiltradas = this.pruebasDisponibles.filter(
              (p) => p.idDisciplina === this.equipoData.idDisciplina,
            );

            if (this.esDeporteCombate) {
              this.jugadorForm.get('peso')?.setValidators([Validators.required]);
              this.jugadorForm.get('altura')?.setValidators([Validators.required]);
            } else {
              this.jugadorForm.get('peso')?.clearValidators();
              this.jugadorForm.get('altura')?.clearValidators();
            }
            this.jugadorForm.get('peso')?.updateValueAndValidity();
            this.jugadorForm.get('altura')?.updateValueAndValidity();
          } else {
            this.tieneEquipoConfigurado = false;
            this.pruebasFiltradas = this.pruebasDisponibles;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Error HTTP:', err);
        },
      });
    } catch (e) {
      console.error('❌ Error Parseo LocalStorage:', e);
    }
  }

  recalcularContadores(): void {
    this.jugadoresInscriptosCount = this.jugadores.length;
    this.cuposRestantes = this.maxJugadoresPermitidos - this.jugadoresInscriptosCount;
  }

  onFileSelected(event: Event, tipoDoc: string): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement && inputElement.files && inputElement.files.length > 0) {
      const file: File = inputElement.files[0];
      if (tipoDoc === 'frente') this.fileDniFrente = file;
      if (tipoDoc === 'dorso') this.fileDniDorso = file;
      if (tipoDoc === 'ficha') this.fileFichaMedica = file;
      this.cdr.detectChanges();
    }
  }

  onGuardarEquipo(): void {
    if (this.configEquipoForm.invalid) {
      this.configEquipoForm.markAllAsTouched();
      return;
    }
    this.procesandoBoton = true;

    const usuarioString = localStorage.getItem('forja_user');
    if (!usuarioString) return;
    const usuarioLogueado = JSON.parse(usuarioString);

    const payload = {
      nombreEquipo: this.configEquipoForm.value.nombreEquipo,
      idPrueba: this.configEquipoForm.value.idPrueba,
      usuarioId: usuarioLogueado.id,
    };

    this.delegacionService.registrarEquipo(payload).subscribe({
      next: (res) => {
        toast.success('¡Instancia Vinculada!', { description: res.mensaje });
        this.tieneEquipoConfigurado = true;
        this.sincronizarEstadoPanel();
        this.procesandoBoton = false;
      },
      error: (err) => {
        this.procesandoBoton = false;
        toast.error('No se pudo guardar', { description: err.error?.error });
      },
    });
  }

  onRegistrarJugador(): void {
    if (this.jugadorForm.invalid) {
      this.jugadorForm.markAllAsTouched();
      return;
    }

    if (!this.modoEdicion && (!this.fileDniFrente || !this.fileDniDorso || !this.fileFichaMedica)) {
      toast.error('Documentación Incompleta', {
        description: 'Debe adjuntar los 3 archivos obligatorios.',
      });
      return;
    }

    this.procesandoBoton = true;

    if (this.modoEdicion && this.idJugadorEdicion) {
      const payloadEdicion = {
        ...this.jugadorForm.value,
        peso: this.jugadorForm.get('peso')?.value || null,
        altura: this.jugadorForm.get('altura')?.value || null,
      };

      this.delegacionService.editarJugador(this.idJugadorEdicion, payloadEdicion).subscribe({
        next: (res) => {
          toast.success('Ficha Actualizada', { description: res.mensaje });
          const idx = this.jugadores.findIndex((j) => j.id === this.idJugadorEdicion);
          if (idx !== -1) this.jugadores[idx] = res.jugador;
          this.cerrarModalJugador();
        },
        error: (err) => {
          this.procesandoBoton = false;
          toast.error('Error al editar', { description: err.error?.error });
        },
      });
    } else {
      const usuarioString = localStorage.getItem('forja_user');
      if (!usuarioString) return;
      const usuarioLogueado = JSON.parse(usuarioString);

      const formData = new FormData();
      formData.append('dni', this.jugadorForm.get('dni')?.value.trim());
      formData.append('nombre', this.jugadorForm.get('nombre')?.value.trim());
      formData.append('apellido', this.jugadorForm.get('apellido')?.value.trim());
      formData.append('fechaNacimiento', this.jugadorForm.get('fechaNacimiento')?.value);
      formData.append('genero', this.jugadorForm.get('genero')?.value);
      formData.append('peso', this.jugadorForm.get('peso')?.value || '');
      formData.append('altura', this.jugadorForm.get('altura')?.value || '');
      formData.append('idPrueba1', this.jugadorForm.get('idPrueba1')?.value);
      formData.append('idPrueba2', this.jugadorForm.get('idPrueba2')?.value || '');
      formData.append('usuarioId', usuarioLogueado.id);

      if (this.fileDniFrente) formData.append('dniFrente', this.fileDniFrente);
      if (this.fileDniDorso) formData.append('dniDorso', this.fileDniDorso);
      if (this.fileFichaMedica) formData.append('fichaMedica', this.fileFichaMedica);

      this.delegacionService.registrarJugador(formData).subscribe({
        next: (res) => {
          toast.success('Atleta Pre-Inscripto', { description: res.mensaje });
          this.jugadores.unshift(res.jugador);
          this.recalcularContadores();
          this.cerrarModalJugador();
        },
        error: (err) => {
          this.procesandoBoton = false;
          toast.error('Inscripción Fue Rechazada', { description: err.error?.error });
        },
      });
    }
  }

  abrirCargaJugador(): void {
    if (this.cuposRestantes <= 0) {
      toast.error('Cupo Máximo Alcanzado', {
        description: 'Esta categoría no permite agregar más atletas.',
      });
      return;
    }
    this.modoEdicion = false;
    this.idJugadorEdicion = null;
    this.jugadorForm.reset({ genero: '', idPrueba1: '', idPrueba2: '' });
    this.mostrarFormularioJugador = true;
    this.cdr.detectChanges();
  }

  abrirEdicionJugador(jugador: any): void {
    this.modoEdicion = true;
    this.idJugadorEdicion = jugador.id;
    const fechaFormateada = jugador.fechaNacimiento ? jugador.fechaNacimiento.substring(0, 10) : '';

    this.jugadorForm.patchValue({
      dni: jugador.dni,
      nombre: jugador.nombre,
      apellido: jugador.apellido,
      fechaNacimiento: fechaFormateada,
      genero: jugador.genero,
      peso: jugador.pesoKg,
      altura: jugador.alturaCm,
      idPrueba1: jugador.idPrueba,
      idPrueba2: jugador.idPrueba2 || '',
    });

    this.mostrarFormularioJugador = true;
    this.cdr.detectChanges();
  }

  // 👇 RUTA INTERMEDIA: Abre el modal estilizado reteniendo el contexto
  solicitarBajaJugador(jugador: any): void {
    this.idJugadorABorrar = jugador.id;
    this.nombreJugadorABorrar = `${jugador.apellido.toUpperCase()}, ${jugador.nombre}`;
    this.mostrarModalConfirmarBorrar = true;
    this.cdr.detectChanges();
  }

  // 👇 CON CONFIRMACIÓN OPTIMISTA INTEGRADA EN TIEMPO REAL 🔥
  confirmarBajaJugador(): void {
    if (!this.idJugadorABorrar) return;

    const idResguardo = this.idJugadorABorrar;

    // 1. RESPUESTA OPTIMISTA INMEDIATA: Respaldamos la lista actual por si falla el VPS
    const listadoResguardo = [...this.jugadores];

    // Modificamos el array visual en el acto (0 milisegundos de retraso para el usuario)
    this.jugadores = this.jugadores.filter((j) => j.id !== idResguardo);
    this.recalcularContadores();
    this.mostrarModalConfirmarBorrar = false; // Cerramos el modal de inmediato
    this.cdr.detectChanges();

    // 2. Ejecutamos la petición física al backend en segundo plano
    this.delegacionService.eliminarJugador(idResguardo).subscribe({
      next: (res) => {
        toast.success('Baja Procesada', { description: res.mensaje });
        this.idJugadorABorrar = null;
        this.nombreJugadorABorrar = '';
      },
      error: (err) => {
        // REVERSIÓN DE EMERGENCIA: Si el servidor falla, restauramos al atleta al instante
        console.error('❌ Falló la baja en el servidor. Revirtiendo grilla...', err);
        this.jugadores = listadoResguardo;
        this.recalcularContadores();
        this.idJugadorABorrar = null;
        this.nombreJugadorABorrar = '';
        this.cdr.detectChanges();

        toast.error('No se pudo procesar la baja', {
          description: err.error?.error || 'Conexión interrumpida con la Secretaría de Deportes.',
        });
      },
    });
  }

  cerrarModalJugador(): void {
    this.jugadorForm.reset({ genero: '' });
    this.fileDniFrente = null;
    this.fileDniDorso = null;
    this.fileFichaMedica = null;
    this.mostrarFormularioJugador = false;
    this.procesandoBoton = false;
    this.cdr.detectChanges();
  }

  logout(): void {
    localStorage.clear();
    toast.success('Sesión finalizada');
    this.router.navigate(['/login']);
  }
}
