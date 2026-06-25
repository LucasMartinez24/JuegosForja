// src/app/modules/municipio/dashboard-equipo/dashboard-equipo.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { DelegacionService } from '../../../core/services/delegacion.service';

@Component({
  selector: 'app-dashboard-equipo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard-equipo-component.html',
  styleUrl: './dashboard-equipo-component.css',
})
export class DashboardEquipoComponent implements OnInit {
  tieneEquipoConfigurado = false;
  mostrarFormularioJugador = false;
  procesandoBoton = false;

  mostrarModalConfirmarBorrar = false;
  idJugadorABorrar: string | null = null;
  nombreJugadorABorrar = '';

  modoEdicion = false;
  idJugadorEdicion: string | null = null;

  configEquipoForm!: FormGroup;
  jugadorForm!: FormGroup;

  disciplinasDisponibles: any[] = [];
  pruebasFiltradasPorDisciplina: any[] = [];
  pruebasFiltradas: any[] = [];
  equipoData: any = null;
  jugadores: any[] = [];

  maxJugadoresPermitidos = 0;
  jugadoresInscriptosCount = 0;
  cuposRestantes = 0;

  // 🚀 REFRACTOR OPERATIVO: Control elástico de cupos unitarios e individuales
  esDisciplinaIlimitada = false;
  esAtletismo = false; // Mantenemos la bandera por si manejás idPrueba2 condicional en el HTML
  esAdaptado = false;

  pruebaSeleccionadaData: any = null;
  anioMinPrueba = 0;
  anioMaxPrueba = 0;

  fileDniFrente: File | null = null;
  fileDniDorso: File | null = null;
  fileFichaMedica: File | null = null;
  fileCud: File | null = null;

  constructor(
    private fb: FormBuilder,
    private delegacionService: DelegacionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.configEquipoForm = this.fb.group({
      nombreEquipo: ['', [Validators.required, Validators.minLength(3)]],
      idDisciplina: ['', Validators.required],
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

    this.jugadorForm.get('genero')?.valueChanges.subscribe((generoSeleccionado) => {
      this.filtrarPruebasPorGenero(generoSeleccionado);
    });

    this.jugadorForm.get('idPrueba1')?.valueChanges.subscribe((idPruebaElegida) => {
      this.evaluarRequerimientosPrueba(idPruebaElegida);
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
          setTimeout(() => {
            this.disciplinasDisponibles = res.disciplinasDisponibles || [];

            if (res.equipoCargado) {
              this.equipoData = res.equipoCargado;
              this.jugadores = res.equipoCargado.jugadores || [];

              const deporte = this.equipoData?.disciplina?.nombre?.toUpperCase() || '';
              const tipoDisciplina = this.equipoData?.disciplina?.tipo?.toUpperCase() || '';

              this.esAtletismo = deporte.includes('ATLETISMO');
              this.esAdaptado = tipoDisciplina === 'ADAPTADO';

              // 🚀 DETECTOR INTELIGENTE: Si NO está en esta lista negra de conjunto, es ILIMITADO
              const deportesEstrictamenteColectivos = [
                'BASQUET 3X3',
                'FUTSAL',
                'HANDBALL',
                'HOCKEY SEVEN',
                'RUGBY 7',
                'VOLEIBOL',
                'VOLEIBOL PLAYA',
                'BASQUET 3X3 ADAPTADO',
                'GOALBALL',
                'VOLEIBOL SENTADO',
              ];
              this.esDisciplinaIlimitada = !deportesEstrictamenteColectivos.includes(
                deporte.trim(),
              );

              this.pruebasFiltradasPorDisciplina =
                res.pruebasDisponibles?.filter(
                  (p: any) => p.idDisciplina === this.equipoData.idDisciplina,
                ) || [];

              this.recalcularContadores();
              this.tieneEquipoConfigurado = true;
            } else {
              this.tieneEquipoConfigurado = false;
            }

            this.cdr.detectChanges();
          }, 0);
        },
        error: (err) => console.error('❌ Error HTTP:', err),
      });
    } catch (e) {
      console.error('❌ Error Parseo LocalStorage:', e);
    }
  }

  filtrarPruebasPorGenero(genero: string): void {
    if (!genero) {
      this.pruebasFiltradas = [];
      return;
    }
    this.pruebasFiltradas = this.pruebasFiltradasPorDisciplina.filter((p: any) => {
      const generoPrueba = p.genero?.toUpperCase();
      return generoPrueba === genero.toUpperCase() || generoPrueba === 'MIXTO';
    });
    this.cdr.detectChanges();
  }

  evaluarRequerimientosPrueba(idPrueba: any): void {
    if (!idPrueba) {
      this.pruebaSeleccionadaData = null;
      return;
    }

    this.pruebaSeleccionadaData = this.pruebasFiltradasPorDisciplina.find(
      (p) => p.id === parseInt(idPrueba),
    );

    if (this.pruebaSeleccionadaData) {
      this.anioMinPrueba = this.pruebaSeleccionadaData.anioNacimientoMin;
      this.anioMaxPrueba = this.pruebaSeleccionadaData.anioNacimientoMax;

      if (this.pruebaSeleccionadaData.requierePeso) {
        this.jugadorForm.get('peso')?.setValidators([Validators.required, Validators.min(1)]);
        this.jugadorForm.get('altura')?.setValidators([Validators.required, Validators.min(100)]);
      } else {
        this.jugadorForm.get('peso')?.clearValidators();
        this.jugadorForm.get('altura')?.clearValidators();
      }

      this.jugadorForm.get('peso')?.updateValueAndValidity();
      this.jugadorForm.get('altura')?.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  recalcularContadores(): void {
    this.jugadoresInscriptosCount = this.jugadores.length;

    if (this.esDisciplinaIlimitada) {
      // 🚀 Si es combate o individual, liberamos las vacantes en los paneles informativos
      this.maxJugadoresPermitidos = 999;
      this.cuposRestantes = 999;
    } else {
      const pruebaBase = this.pruebasFiltradasPorDisciplina[0];
      this.maxJugadoresPermitidos = pruebaBase ? pruebaBase.maxJugadores : 12;
      const restante = this.maxJugadoresPermitidos - this.jugadoresInscriptosCount;
      this.cuposRestantes = restante < 0 ? 0 : restante;
    }
  }

  onFileSelected(event: Event, tipoDoc: string): void {
    const inputElement = event.target as HTMLInputElement;
    if (inputElement && inputElement.files && inputElement.files.length > 0) {
      const file: File = inputElement.files[0];
      if (tipoDoc === 'frente') this.fileDniFrente = file;
      if (tipoDoc === 'dorso') this.fileDniDorso = file;
      if (tipoDoc === 'ficha') this.fileFichaMedica = file;
      if (tipoDoc === 'cud') this.fileCud = file;
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
      idDisciplina: parseInt(this.configEquipoForm.value.idDisciplina),
      usuarioId: usuarioLogueado.id,
    };

    this.delegacionService.registrarEquipo(payload).subscribe({
      next: (res: any) => {
        toast.success('¡Entorno Configurado!', { description: res.mensaje });
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

    const fechaNac = this.jugadorForm.get('fechaNacimiento')?.value;
    if (fechaNac && this.pruebaSeleccionadaData) {
      const anioAtleta = new Date(fechaNac).getFullYear();
      if (anioAtleta < this.anioMinPrueba || anioAtleta > this.anioMaxPrueba) {
        toast.error('Restricción de Edad', {
          description: `El atleta debe haber nacido entre ${this.anioMinPrueba} y ${this.anioMaxPrueba} para ingresar a esta prueba.`,
        });
        return;
      }
    }

    const pesoIngresado = this.jugadorForm.get('peso')?.value;
    if (this.pruebaSeleccionadaData?.requierePeso && pesoIngresado) {
      const pesoMaxPermitido = parseFloat(this.pruebaSeleccionadaData.pesoMaximo);
      if (pesoMaxPermitido && parseFloat(pesoIngresado) > pesoMaxPermitido) {
        toast.error('Exceso de Peso', {
          description: `El peso máximo permitido para la categoría es de ${pesoMaxPermitido} kg.`,
        });
        return;
      }
    }

    if (!this.modoEdicion) {
      if (!this.fileDniFrente || !this.fileDniDorso || !this.fileFichaMedica) {
        toast.error('Documentación Incompleta', {
          description: 'Debe adjuntar los 3 archivos obligatorios.',
        });
        return;
      }
      if (this.esAdaptado && !this.fileCud) {
        toast.error('CUD Obligatorio', {
          description: 'Las disciplinas adaptadas exigen el Certificado de Discapacidad.',
        });
        return;
      }
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
      if (this.esAdaptado && this.fileCud) formData.append('cud', this.fileCud);

      this.delegacionService.registrarJugador(formData).subscribe({
        next: (res) => {
          toast.success('Atleta Pre-Inscripto', { description: res.mensaje });
          this.jugadores.unshift(res.jugador);
          this.recalcularContadores();
          this.cerrarModalJugador();
        },
        error: (err) => {
          this.procesandoBoton = false;
          toast.error('Inscripción de Roster Fallida', { description: err.error?.error });
        },
      });
    }
  }

  abrirCargaJugador(): void {
    // 🚀 Cambiado: Ahora evalúa de forma elástica si NO es ilimitado para trabar las vacantes
    if (!this.esDisciplinaIlimitada && this.cuposRestantes <= 0) {
      toast.error('Lista de Buena Fe Completa', {
        description:
          'La delegación ya ha ocupado el máximo de vacantes permitidas para esta disciplina.',
        position: 'top-center',
      });
      return;
    }

    this.modoEdicion = false;
    this.idJugadorEdicion = null;
    this.pruebaSeleccionadaData = null;
    this.jugadorForm.reset({ genero: '', idPrueba1: '', idPrueba2: '' });
    this.pruebasFiltradas = [];
    this.mostrarFormularioJugador = true;
    this.cdr.detectChanges();
  }

  abrirEdicionJugador(jugador: any): void {
    this.modoEdicion = true;
    this.idJugadorEdicion = jugador.id;
    const fechaFormateada = jugador.fechaNacimiento ? jugador.fechaNacimiento.substring(0, 10) : '';

    this.filtrarPruebasPorGenero(jugador.genero);
    this.evaluarRequerimientosPrueba(jugador.idPrueba);

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

  solicitarBajaJugador(jugador: any): void {
    this.idJugadorABorrar = jugador.id;
    this.nombreJugadorABorrar = `${jugador.apellido.toUpperCase()}, ${jugador.nombre}`;
    this.mostrarModalConfirmarBorrar = true;
    this.cdr.detectChanges();
  }

  confirmarBajaJugador(): void {
    if (!this.idJugadorABorrar) return;

    const idResguardo = this.idJugadorABorrar;
    const listadoResguardo = [...this.jugadores];

    this.jugadores = this.jugadores.filter((j) => j.id !== idResguardo);
    this.recalcularContadores();
    this.mostrarModalConfirmarBorrar = false;
    this.cdr.detectChanges();

    this.delegacionService.eliminarJugador(idResguardo).subscribe({
      next: (res) => {
        toast.success('Baja Procesada', { description: res.mensaje });
        this.idJugadorABorrar = null;
        this.nombreJugadorABorrar = '';
      },
      error: (err) => {
        this.jugadores = listadoResguardo;
        this.recalcularContadores();
        this.idJugadorABorrar = null;
        this.nombreJugadorABorrar = '';
        this.cdr.detectChanges();
        toast.error('No se pudo procesar la baja', { description: err.error?.error });
      },
    });
  }

  cerrarModalJugador(): void {
    this.jugadorForm.reset({ genero: '' });
    this.fileDniFrente = null;
    this.fileDniDorso = null;
    this.fileFichaMedica = null;
    this.fileCud = null;
    this.pruebasFiltradas = [];
    this.pruebaSeleccionadaData = null;
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
