import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../../core/services/admin.service';

/**
 * Modal reutilizable para editar los datos de un atleta (sin documentación).
 * Lo usa tanto el roster del dashboard-admin como la vista por género.
 * Emite el atleta actualizado para que el padre refresque su vista.
 */
@Component({
  selector: 'app-editar-atleta-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './editar-atleta-modal-component.html',
  styleUrl: './editar-atleta-modal-component.css',
})
export class EditarAtletaModalComponent implements OnInit {
  @Input() atleta: any = null;
  @Input() contexto: any = null;
  @Output() actualizado = new EventEmitter<any>();
  @Output() cerrado = new EventEmitter<void>();

  atletaForm!: FormGroup;
  cargandoPruebas = false;
  procesando = false;

  pruebasDisponibles: any[] = [];
  pruebasFiltradas: any[] = [];
  pruebaSeleccionadaData: any = null;
  anioMinPrueba: number | null = null;
  anioMaxPrueba: number | null = null;
  esAtletismo = false;
  esNatacion = false;
  requierePeso = false;

  serverUrl = '';

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {
    this.serverUrl = this.adminService.serverUrl;
  }

  ngOnInit(): void {
    this.atletaForm = this.fb.group({
      dni: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      apellido: ['', [Validators.required, Validators.minLength(2)]],
      fechaNacimiento: ['', Validators.required],
      genero: ['', Validators.required],
      peso: [''],
      altura: [''],
      idPrueba1: ['', Validators.required],
      idPrueba2: [''],
      idPrueba3: [''],
      idPrueba4: [''],
      idPrueba5: [''],
      idPrueba6: [''],
    });

    if (!this.atleta) return;
    // Cargamos la ficha COMPLETA desde el backend para garantizar que
    // peso, altura y demás datos lleguen al modal sin depender de lo
    // que trae la grilla/árbol. Si falla, usamos lo que ya recibimos.
    this.cargarAtletaCompleto();
  }

  cargarAtletaCompleto(): void {
    this.cargandoPruebas = true;
    this.adminService.obtenerAtletaDetalle(this.atleta.id).subscribe({
      next: (res: any) => {
        if (res) this.atleta = res;
        this.aplicarDatos();
      },
      error: () => {
        this.cargandoPruebas = false;
        this.aplicarDatos();
      },
    });
  }

  aplicarDatos(): void {
    const a = this.atleta;
    if (!a) return;

    const nombreDisciplina = (
      a.deporteAsignado ||
      a.equipo?.disciplina ||
      this.contexto?.disciplina ||
      a.prueba?.nombrePrueba ||
      ''
    ).toUpperCase();
    this.esAtletismo = nombreDisciplina.includes('ATLETISMO');
    this.esNatacion = nombreDisciplina.includes('NATACION');

    this.atletaForm.patchValue({
      dni: a.dni || '',
      nombre: a.nombre || '',
      apellido: a.apellido || '',
      fechaNacimiento: this.aFormatoFechaInput(a.fechaNacimiento),
      genero: a.genero || '',
      peso: a.pesoKg ?? '',
      altura: a.alturaCm ?? '',
      idPrueba1: a.idPrueba ?? a.prueba?.id ?? '',
    });

    const adicIds: number[] = (a.pruebasAdicionales || [])
      .map((e: any) => e.prueba?.id)
      .filter((id: any) => !!id);
    adicIds.forEach((id: number, i: number) => {
      if (i < 5) this.atletaForm.patchValue({ [`idPrueba${i + 2}`]: id });
    });

    this.cargarPruebas();
  }

  aFormatoFechaInput(iso: string): string {
    if (!iso) return '';
    // Evita el corrimiento de zona horaria: tomamos la parte de fecha literal
    if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso)) {
      return iso.slice(0, 10);
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  cargarPruebas(): void {
    const idDisciplina =
      this.atleta?.prueba?.idDisciplina ??
      this.atleta?.equipo?.idDisciplina ??
      this.contexto?.idDisciplina;
    if (!idDisciplina) return;
    this.cargandoPruebas = true;
    this.adminService.obtenerPruebasPorDisciplina(idDisciplina).subscribe({
      next: (res) => {
        this.pruebasDisponibles = res?.pruebas || [];
        this.filtrarPruebasPorGenero(this.atletaForm.get('genero')?.value);
        this.evaluarRequerimientosPrueba(this.atletaForm.get('idPrueba1')?.value);
        this.cargandoPruebas = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargandoPruebas = false;
        toast.error('No se pudo cargar el catálogo de pruebas.');
      },
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
      this.requierePeso = false;
      return;
    }
    this.pruebaSeleccionadaData = this.pruebasDisponibles.find(
      (p) => p.id === parseInt(idPrueba, 10),
    );
    this.requierePeso = !!this.pruebaSeleccionadaData?.requierePeso;
    if (this.pruebaSeleccionadaData) {
      this.anioMinPrueba = this.pruebaSeleccionadaData.anioNacimientoMin;
      this.anioMaxPrueba = this.pruebaSeleccionadaData.anioNacimientoMax;
      if (this.requierePeso) {
        this.atletaForm.get('peso')?.setValidators([Validators.required, Validators.min(1)]);
        this.atletaForm.get('altura')?.setValidators([Validators.required, Validators.min(100)]);
      } else {
        // Disciplinas que no exigen peso: opcional, se puede cargar/editar.
        this.atletaForm.get('peso')?.clearValidators();
        this.atletaForm.get('altura')?.clearValidators();
      }
      this.atletaForm.get('peso')?.updateValueAndValidity();
      this.atletaForm.get('altura')?.updateValueAndValidity();
      this.cdr.detectChanges();
    }
  }

  onCancelar(): void {
    this.cerrado.emit();
  }

  onSubmit(): void {
    if (this.atletaForm.invalid) {
      this.atletaForm.markAllAsTouched();
      return;
    }
    this.procesando = true;

    const extras: number[] = [];
    const maxSelectsAdicionales = this.esAtletismo ? 2 : this.esNatacion ? 6 : 2;
    for (let i = 2; i <= maxSelectsAdicionales; i++) {
      const v = this.atletaForm.get(`idPrueba${i}`)?.value;
      if (v) extras.push(parseInt(v, 10));
    }

    const payload = {
      dni: this.atletaForm.value.dni,
      nombre: this.atletaForm.value.nombre,
      apellido: this.atletaForm.value.apellido,
      fechaNacimiento: this.atletaForm.value.fechaNacimiento,
      genero: this.atletaForm.value.genero,
      peso: this.atletaForm.value.peso,
      altura: this.atletaForm.value.altura,
      idPrueba1: parseInt(this.atletaForm.value.idPrueba1, 10),
      pruebasAdicionales: extras,
    };

    this.adminService.actualizarAtleta(this.atleta.id, payload).subscribe({
      next: (res) => {
        this.procesando = false;
        toast.success('Atleta actualizado', { description: res.mensaje });
        const actualizado = {
          ...this.atleta,
          ...res.atleta,
          prueba: res.atleta.prueba,
          pruebasAdicionales: (res.atleta.pruebasAdicionales || []).map(
            (e: any) => ({ prueba: e.prueba }),
          ),
        };
        this.actualizado.emit(actualizado);
      },
      error: (err) => {
        this.procesando = false;
        toast.error('No se pudo actualizar el atleta', {
          description: err.error?.error,
        });
        this.cdr.detectChanges();
      },
    });
  }
}
