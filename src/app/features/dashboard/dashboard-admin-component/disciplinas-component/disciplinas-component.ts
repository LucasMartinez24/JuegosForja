import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import { AdminService } from '../../../../core/services/admin.service';

/**
 * Vista de CATÁLOGO de disciplinas provinciales.
 *
 * Al seleccionar un deporte se navega a `/dashboard-admin/disciplinas/:id`,
 * donde el componente `DisciplinaDetalleComponent` muestra todos los equipos
 * pertenecientes a esa disciplina con su desglose por género.
 */
@Component({
  selector: 'app-disciplinas-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disciplinas-component.html',
  styleUrl: './disciplinas-component.css',
})
export class DisciplinasComponent implements OnInit {
  cargando = true;

  disciplinas: any[] = [];

  constructor(
    private adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarDisciplinas();
  }

  cargarDisciplinas(): void {
    this.cargando = true;
    this.adminService.obtenerCatalogoDisciplinas().subscribe({
      next: (res) => {
        this.disciplinas = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cargando = false;
        toast.error('No se pudo cargar el catálogo de disciplinas.');
        this.cdr.detectChanges();
      },
    });
  }

  abrirDisciplina(d: any): void {
    this.router.navigate(['/dashboard-admin/disciplinas', d.id]);
  }

  volver(): void {
    this.router.navigate(['/dashboard-admin']);
  }
}
