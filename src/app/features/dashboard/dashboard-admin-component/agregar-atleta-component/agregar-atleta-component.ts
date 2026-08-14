import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../../core/services/admin.service';

/**
 * Formulario para que el ADMIN cargue atletas a un equipo cualquiera.
 * Es un componente standalone, pensado para embebir en la pestaña
 * "Alta de Clubes" del dashboard admin o usarse como ruta independiente
 * en /dashboard-admin/agregar-atleta.
 */
@Component({
  selector: 'app-agregar-atleta-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './agregar-atleta-component.html',
  styleUrl: './agregar-atleta-component.css',
})
export class AgregarAtletaComponent implements OnInit {
  /** Se dispara tras un alta exitosa para que el dashboard refresque el árbol. */
  @Output() atletaRegistrado = new EventEmitter<void>();

  atletaForm!: FormGroup;
  procesando = false;

  equiposDisponibles: any[] = [];
  pruebasDisponibles: any[] = [];
  pruebasFiltradas: any[] = [];
  pruebaSeleccionadaData: any = null;
  anioMinPrueba: number | null = null;
  anioMaxPrueba: number | null = null;
  equipoSeleccionado: any = null;
  requiereCud = false;
  esAtletismo = false;
  esNatacion = false;

  archivos: { [key: string]: File | null } = {
    dniFrente: null,
    dniDorso: null,
    fichaMedica: null,
    cud: null,
  };

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.atletaForm = this.fb.group({
      idEquipo: ['', Validators.required],
      idPrueba1: ['', Validators.required],
      idPrueba2: [''],
      idPrueba3: [''],
      idPrueba4: [''],
      idPrueba5: [''],
      idPrueba6: [''],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      peso: [''],
      altura: [''],
    });

    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.adminService.listarEquiposDisponibles().subscribe({
      next: (res) => {
        this.equiposDisponibles = res || [];
        this.cdr.detectChanges();
      },
      error: () => toast.error('No se pudo cargar el listado de equipos.'),
    });
  }

  onEquipoChange(): void {
    const id = this.atletaForm.get('idEquipo')?.value;
    this.pruebasDisponibles = [];
    this.pruebasFiltradas = [];
    this.pruebaSeleccionadaData = null;
    this.anioMinPrueba = null;
    this.anioMaxPrueba = null;
    this.requiereCud = false;
    this.esAtletismo = false;
    this.esNatacion = false;
    this.equipoSeleccionado = null;
    this.atletaForm.patchValue({
      idPrueba1: '',
      idPrueba2: '',
      idPrueba3: '',
      idPrueba4: '',
      idPrueba5: '',
      idPrueba6: '',
    });
    this.atletaForm.get('peso')?.clearValidators();
    this.atletaForm.get('altura')?.clearValidators();
    this.atletaForm.get('peso')?.updateValueAndValidity();
    this.atletaForm.get('altura')?.updateValueAndValidity();

    if (!id) return;

    const equipo = this.equiposDisponibles.find((e) => e.id === id);
    if (!equipo) return;

    this.equipoSeleccionado = equipo;
    this.requiereCud = equipo.disciplina?.tipo === 'ADAPTADO';
    const nombreDisciplina = (equipo.disciplina?.nombre || '').toUpperCase();
    this.esAtletismo = nombreDisciplina.includes('ATLETISMO');
    this.esNatacion = nombreDisciplina.includes('NATACION');

    this.adminService.obtenerPruebasPorDisciplina(equipo.disciplina.id).subscribe({
      next: (res) => {
        this.pruebasDisponibles = res?.pruebas || [];
        this.filtrarPruebasPorGenero(this.atletaForm.get('genero')?.value);
        this.cdr.detectChanges();
      },
      error: () => toast.error('No se pudo cargar el catálogo de pruebas.'),
    });
  }

  onGeneroChange(): void {
    const genero = this.atletaForm.get('genero')?.value;
    this.atletaForm.patchValue({
      idPrueba1: '',
      idPrueba2: '',
      idPrueba3: '',
      idPrueba4: '',
      idPrueba5: '',
      idPrueba6: '',
    });
    this.pruebaSeleccionadaData = null;
    this.anioMinPrueba = null;
    this.anioMaxPrueba = null;
    this.filtrarPruebasPorGenero(genero);
  }

  filtrarPruebasPorGenero(genero: string): void {
    if (!genero) {
      this.pruebasFiltradas = [];
      this.cdr.detectChanges();
      return;
    }
    this.pruebasFiltradas = this.pruebasDisponibles.filter((p: any) => {
      const generoPrueba = p.genero?.toUpperCase();
      return generoPrueba === genero.toUpperCase() || generoPrueba === 'MIXTO';
    });
    this.cdr.detectChanges();
  }

  onPrueba1Change(): void {
    this.evaluarRequerimientosPrueba(this.atletaForm.get('idPrueba1')?.value);
  }

  evaluarRequerimientosPrueba(idPrueba: any): void {
    if (!idPrueba) {
      this.pruebaSeleccionadaData = null;
      return;
    }
    this.pruebaSeleccionadaData = this.pruebasDisponibles.find(
      (p) => p.id === parseInt(idPrueba),
    );
    if (this.pruebaSeleccionadaData) {
      this.anioMinPrueba = this.pruebaSeleccionadaData.anioNacimientoMin;
      this.anioMaxPrueba = this.pruebaSeleccionadaData.anioNacimientoMax;
      if (this.pruebaSeleccionadaData.requierePeso) {
        this.atletaForm.get('peso')?.setValidators([Validators.required, Validators.min(1)]);
        this.atletaForm.get('altura')?.setValidators([Validators.required, Validators.min(100)]);
      } else {
        this.atletaForm.get('peso')?.setValidators([Validators.required]);
        this.atletaForm.get('altura')?.setValidators([Validators.required]);
      }
      this.atletaForm.get('peso')?.updateValueAndValidity();
      this.atletaForm.get('altura')?.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onFile(event: Event, key: string): void {
    const input = event.target as HTMLInputElement;
    this.archivos[key] = input.files && input.files.length > 0 ? input.files[0] : null;
  }

  onSubmit(): void {
    if (this.atletaForm.invalid) {
      this.atletaForm.markAllAsTouched();
      return;
    }
    if (!this.archivos['dniFrente'] || !this.archivos['dniDorso'] || !this.archivos['fichaMedica']) {
      toast.warning('Falta documentación', {
        description: 'DNI frente/dorso y ficha médica son obligatorios.',
      });
      return;
    }
    if (this.requiereCud && !this.archivos['cud']) {
      toast.warning('Falta CUD', {
        description: 'Esta disciplina requiere el Certificado Único de Discapacidad.',
      });
      return;
    }

    this.procesando = true;

    const formData = new FormData();
    Object.entries(this.atletaForm.value).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') formData.append(k, String(v));
    });

    const pruebasExtras: string[] = [];
    const maxSelectsAdicionales = this.esAtletismo ? 2 : 6;
    for (let i = 2; i <= maxSelectsAdicionales; i++) {
      const val = this.atletaForm.get(`idPrueba${i}`)?.value;
      if (val) pruebasExtras.push(val);
    }
    formData.append('pruebasAdicionales', JSON.stringify(pruebasExtras));

    Object.entries(this.archivos).forEach(([k, file]) => {
      if (file) formData.append(k, file);
    });

    const idEquipo = this.atletaForm.value.idEquipo;

    this.adminService.agregarAtletaAEquipo(idEquipo, formData).subscribe({
      next: (res) => {
        this.procesando = false;
        toast.success('Atleta registrado', { description: res.mensaje });
        this.atletaForm.reset({
          idEquipo: '',
          idPrueba1: '',
          idPrueba2: '',
          idPrueba3: '',
          idPrueba4: '',
          idPrueba5: '',
          idPrueba6: '',
        });
        this.archivos = { dniFrente: null, dniDorso: null, fichaMedica: null, cud: null };
        this.pruebasDisponibles = [];
        this.pruebasFiltradas = [];
        this.pruebaSeleccionadaData = null;
        this.anioMinPrueba = null;
        this.anioMaxPrueba = null;
        this.atletaForm.get('peso')?.clearValidators();
        this.atletaForm.get('altura')?.clearValidators();
        this.atletaForm.get('peso')?.updateValueAndValidity();
        this.atletaForm.get('altura')?.updateValueAndValidity();
        this.requiereCud = false;
        this.esAtletismo = false;
        this.esNatacion = false;
        this.equipoSeleccionado = null;
        this.atletaRegistrado.emit();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.procesando = false;
        toast.error('No se pudo registrar el atleta', {
          description: err.error?.error,
        });
        this.cdr.detectChanges();
      },
    });
  }
}