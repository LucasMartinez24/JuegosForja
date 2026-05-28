import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toast } from 'ngx-sonner';
import { AuthService } from '../../../core/services/auth.services';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  registroForm!: FormGroup;
  pestanaActiva: 'login' | 'registro' = 'login';
  cargando = false;
  localidadesProvinciales: any[] = [];

  // Almacenamiento físico de los binarios para el FormData
  fileRepFrente: File | null = null;
  fileRepDorso: File | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef, // 🚀 Agregado para forzar renderizado de nombres de archivos
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registroForm = this.fb.group({
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.pattern('^[a-zA-Z0-9_]+$')],
      ],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombreRepresentante: ['', Validators.required],
      apellido: ['', Validators.required],
      dniRepresentante: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]],
      idLocalidad: ['', Validators.required],

      // 🚀 SOLUCIÓN: Agregamos los campos binarios al ciclo oficial de validación de Angular
      dniFrente: [null, Validators.required],
      dniDorso: [null, Validators.required],
    });

    this.cargarLocalidadesPublicas();
  }

  cargarLocalidadesPublicas(): void {
    this.http.get<any[]>(`${environment.apiUrl}/auth/localidades`).subscribe({
      next: (res) => (this.localidadesProvinciales = res),
      error: (err) => console.error('Error al traer localidades:', err),
    });
  }

  cambiarPestana(pestana: 'login' | 'registro'): void {
    if (this.pestanaActiva === pestana) return;
    this.pestanaActiva = pestana;
  }

  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.cargando = true;

    const { username, password } = this.loginForm.value;

    this.authService.login(username, password).subscribe({
      next: (res: any) => {
        this.cargando = false;

        // 🚀 1. SOLUCIÓN CRÍTICA: Persistir el token de seguridad JWT
        if (res.token) {
          localStorage.setItem('token', res.token);
        }

        // 🚀 2. SOLUCIÓN: Persistir los datos del perfil para el componente de cambio de clave
        if (res.usuario) {
          localStorage.setItem('forja_user', JSON.stringify(res.usuario));

          const claims = {
            idLocalidad: res.usuario.idLocalidad,
            localidadNombre: res.usuario.localidadNombre || 'Municipio',
            rol: res.usuario.rol,
          };
          localStorage.setItem('user_claims', JSON.stringify(claims));
        }

        // 🚀 Intercepción para cambio de contraseña obligatorio
        if (res.debeCambiarClave) {
          toast.warning('Seguridad Obligatoria', {
            description: 'Debe actualizar su contraseña genérica antes de ingresar al panel.',
            duration: 5000,
          });
          this.router.navigate(['/auth/cambiar-clave-obligatoria']);
          return;
        }

        const rol = this.authService.getObtenerRol();
        console.log('🔰 Rol detectado:', rol);

        // Redirección convencional
        if (rol === 'ADMIN') {
          this.router.navigate(['/dashboard-admin']);
        } else if (rol === 'MUNICIPIO') {
          this.router.navigate(['/dashboard-municipio']);
        } else if (rol === 'EQUIPO') {
          this.router.navigate(['/dashboard-equipo']);
        }
      },
      error: (err) => {
        this.cargando = false;
        toast.error(err.error?.error || 'Error de autenticación');
      },
    });
  }

  onFileRepresentanteSelected(event: Event, tipo: 'frente' | 'dorso'): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files.length > 0) {
      const file = input.files[0];

      if (tipo === 'frente') {
        this.fileRepFrente = file;
        // 🚀 Notificamos al control reactivo que ya posee valor para satisfacer el Validator
        this.registroForm.get('dniFrente')?.setValue(file);
      } else {
        this.fileRepDorso = file;
        this.registroForm.get('dniDorso')?.setValue(file);
      }

      this.cdr.detectChanges(); // Forzamos actualización visual de la interfaz
    }
  }

  onRegistroSubmit(): void {
    // Si falta algún documento o texto, markAllAsTouched bloqueará el submit e iluminará los campos inválidos
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      toast.error('Formulario Incompleto', {
        description: 'Por favor, complete todos los campos y adjunte la documentación requerida.',
      });
      return;
    }

    this.cargando = true;

    const formData = new FormData();
    formData.append('username', this.registroForm.value.username);
    formData.append('password', this.registroForm.value.password);
    formData.append('nombreRepresentante', this.registroForm.value.nombreRepresentante);
    formData.append('apellido', this.registroForm.value.apellido);
    formData.append('dniRepresentante', this.registroForm.value.dniRepresentante);
    formData.append('idLocalidad', this.registroForm.value.idLocalidad);

    // Adjuntamos los archivos guardados de forma segura
    if (this.fileRepFrente) formData.append('dniFrente', this.fileRepFrente);
    if (this.fileRepDorso) formData.append('dniDorso', this.fileRepDorso);

    this.http.post(`${environment.apiUrl}/auth/register`, formData).subscribe({
      next: () => {
        this.cargando = false;
        toast.success('¡Registro Procesado!', {
          description:
            'La delegación fue creada. Su documentación pasará a revisión por la coordinación local.',
        });
        this.registroForm.reset();
        this.fileRepFrente = null;
        this.fileRepDorso = null;
        this.pestanaActiva = 'login';
      },
      error: (err) => {
        this.cargando = false;
        toast.error('No se pudo completar el registro', {
          description: err.error?.error || 'Verifique el tamaño o formato de las imágenes.',
        });
      },
    });
  }
}
