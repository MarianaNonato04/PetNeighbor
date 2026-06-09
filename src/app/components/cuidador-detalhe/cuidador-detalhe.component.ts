import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Cuidador, TipoServico } from '../../models/interfaces';

@Component({
  selector: 'app-cuidador-detalhe',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cuidador-detalhe.component.html',
  styleUrls: ['./cuidador-detalhe.component.css']
})
export class CuidadorDetalheComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  cuidador = signal<Cuidador | null>(null);
  isLoading = signal(true);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/explorar']);
      return;
    }
    this.supabase.getCuidador(id).subscribe({
      next: data => {
        this.cuidador.set(data?.[0] ?? null);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  precoDe(c: Cuidador, s: TipoServico): number {
    return { 'Passeio': c.preco_passeio, 'Alimentação': c.preco_alimentacao, 'Companhia': c.preco_companhia }[s];
  }

  agendar() {
    const c = this.cuidador();
    if (c) this.router.navigate(['/agendar', c.id_cuidador]);
  }

  conversar() {
    const c = this.cuidador();
    if (c) this.router.navigate(['/chat', c.id_cuidador]);
  }
}
