// src/app/modules/auth/cambiar-clave-obligatoria/cambiar-clave-obligatoria.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { toast } from 'ngx-sonner';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-cambiar-clave-obligatoria',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './cambiar-clave-obligatoria-component.html',
  styleUrl: './cambiar-clave-obligatoria-component.css',
})
export class CambiarClaveObligatoriaComponent implements OnInit {
  claveForm!: FormGroup;
  procesando = false;
  usernameUsuario = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Recuperamos el nombre del usuario para mostrarlo estéticamente en la tarjeta
    const userString = localStorage.getItem('forja_user');
    if (userString) {
      const user = JSON.parse(userString);
      this.usernameUsuario = user.username?.toUpperCase() || 'COORDINADOR';
    }

    // Inicializamos el formulario con regla de mínimo 6 caracteres
    this.claveForm = this.fb.group(
      {
        nuevaPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmarPassword: ['', [Validators.required]],
      },
      {
        validators: this.validarQueCoincidan,
      },
    );
  }

  // Validador personalizado para chequear que repita bien la clave
  private validarQueCoincidan(group: FormGroup) {
    const nueva = group.get('nuevaPassword')?.value;
    const confirmar = group.get('confirmarPassword')?.value;
    return nueva === confirmar ? null : { noCoincide: true };
  }

  onCambiarClaveSubmit(): void {
    if (this.claveForm.invalid || this.procesando) {
      this.claveForm.markAllAsTouched();
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Sesión expirada', { description: 'Por favor, vuelva a loguearse.' });
      this.router.navigate(['/login']);
      return;
    }

    this.procesando = true;

    // Seteamos las cabeceras con el token JWT de forma explícita
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const payload = {
      nuevaPassword: this.claveForm.value.nuevaPassword,
    };

    this.http
      .post(`${environment.apiUrl}/auth/cambiar-password-inicial`, payload, { headers })
      .subscribe({
        next: (res: any) => {
          this.procesando = false;
          toast.success('¡Cuenta Activada de forma Exitosa!', {
            description: 'Su nueva contraseña institucional fue guardada.',
            duration: 4000,
          });

          // Recuperamos los claims de rol para mandarlo a su dashboard correspondiente
          const claimsString = localStorage.getItem('user_claims');
          if (claimsString) {
            const claims = JSON.parse(claimsString);
            setTimeout(() => {
              if (claims.rol === 'ADMIN') this.router.navigate(['/dashboard-admin']);
              else if (claims.rol === 'MUNICIPIO') this.router.navigate(['/dashboard-municipio']);
              else this.router.navigate(['/dashboard-equipo']);
            }, 1500);
          } else {
            // Si no hay claims por alguna razón, lo mandamos al login para que refresque
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        },
        error: (err) => {
          this.procesando = false;
          toast.error('Error al actualizar clave', {
            description: err.error?.error || 'No se pudo conectar con el servidor central.',
          });
        },
      });
  }

  cancelar(): void {
    // Si decide no cambiarla, limpiamos el token temporal y lo pateamos de vuelta al Login
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}
