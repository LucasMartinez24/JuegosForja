import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.services';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.css',
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  registroForm!: FormGroup;

  pestanaActiva: 'login' | 'registro' = 'login';
  cargando = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registroForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      nombreRepresentante: ['', Validators.required],
      apellido: ['', Validators.required],
      dniRepresentante: ['', [Validators.required, Validators.pattern('^[0-9]{7,8}$')]], // <-- NUEVO CONTROL VALIDADO
      municipio: ['', Validators.required],
    });
  }

  cambiarPestana(pestana: 'login' | 'registro'): void {
    if (this.pestanaActiva === pestana) return;
    this.pestanaActiva = pestana;
  }

  // Adentro de src/app/features/auth/login.component.ts -> método onLoginSubmit()
  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.cargando = true;

    this.authService.login(this.loginForm.value.email, this.loginForm.value.password).subscribe({
      next: () => {
        this.cargando = false;

        // 1. Validamos el rol guardado en las propiedades del AuthService tras descifrar el JWT
        const rol = this.authService.getObtenerRol();
        console.log('🔰 Rol detectado en el inicio de sesión:', rol);

        // 2. Enrutamiento inteligente según el rango del usuario 🚀
        if (rol === 'ADMIN') {
          toast.success('¡Acceso de Auditor Otorgado!', {
            description: 'Bienvenido al Panel de Control Central del Ministerio.',
          });
          this.router.navigate(['/dashboard-admin']); // Redirige al árbol colapsable provincial
        } else if (rol === 'EQUIPO') {
          toast.success('¡Acceso Concedido!', {
            description: 'Bienvenido a la plataforma de carga de los Juegos FORJA.',
          });
          this.router.navigate(['/dashboard-equipo']); // Redirige al panel de las listas de buena fe
        } else {
          // Medida defensiva por si en el futuro agregás el rol 'MUNICIPIO' o cae un rol desconocido
          toast.error('Acceso Restringido', {
            description: 'El rol de esta cuenta no posee un entorno configurado en esta terminal.',
          });
          this.authService.logout();
        }
      },
      error: (err) => {
        this.cargando = false;
        toast.error('Error de autenticación', {
          description: err.error?.error || 'Verifique sus credenciales e intente nuevamente.',
        });
      },
    });
  }

  onRegistroSubmit(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    this.cargando = true;

    const payload = {
      email: this.registroForm.value.email,
      password: this.registroForm.value.password,
      rol: 'EQUIPO',
      nombreRepresentante: this.registroForm.value.nombreRepresentante,
      apellido: this.registroForm.value.apellido,
      dniRepresentante: this.registroForm.value.dniRepresentante, // <-- Inyectado al payload
      municipio: this.registroForm.value.municipio,
    };

    this.http.post('http://localhost:3000/api/auth/register', payload).subscribe({
      next: () => {
        this.cargando = false;
        toast.success('Registro completado', {
          description: `El representante con DNI ${payload.dniRepresentante} se dio de alta correctamente.`,
        });
        this.registroForm.reset();
        this.pestanaActiva = 'login';
      },
      error: (err) => {
        this.cargando = false;
        toast.error('No se pudo procesar el alta', {
          description: err.error?.error || 'Hubo un inconveniente en el servidor.',
        });
      },
    });
  }
}
