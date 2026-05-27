import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.services';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toast } from 'ngx-sonner';
import { Component, OnInit } from '@angular/core';
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

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
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
      tokenInvitacion: ['', [Validators.required, Validators.minLength(5)]],
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
        // 🚩 Capturamos la respuesta 'res'
        this.cargando = false;

        // 💾 GUARDAR CLAIMS PARA EL DASHBOARD
        // Extraemos los datos que el backend debería estar enviando
        if (res.usuario) {
          const claims = {
            idLocalidad: res.usuario.idLocalidad,
            localidadNombre: res.usuario.localidadNombre || 'Municipio',
            rol: res.usuario.rol,
          };
          localStorage.setItem('user_claims', JSON.stringify(claims));
        }

        const rol = this.authService.getObtenerRol();
        console.log('🔰 Rol detectado:', rol);

        // Lógica de redirección...
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
        toast.error('Error de autenticación');
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
      username: this.registroForm.value.username,
      password: this.registroForm.value.password,
      nombreRepresentante: this.registroForm.value.nombreRepresentante,
      apellido: this.registroForm.value.apellido,
      dniRepresentante: this.registroForm.value.dniRepresentante,
      idLocalidad: parseInt(this.registroForm.value.idLocalidad),
      tokenInvitacion: this.registroForm.value.tokenInvitacion,
    };

    this.http.post(`${environment.apiUrl}/auth/register`, payload).subscribe({
      next: () => {
        this.cargando = false;
        toast.success('¡Registro Exitoso por Lista Blanca!', {
          description: `El delegado del club "${payload.username}" fue dado de alta correctamente.`,
        });
        this.registroForm.reset();
        this.pestanaActiva = 'login';
      },
      error: (err) => {
        this.cargando = false;
        toast.error('Token Fue Rechazado', {
          description: err.error?.error || 'No se pudo procesar el alta.',
        });
      },
    });
  }
}
