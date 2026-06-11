import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { NotificacaoStore } from '../../services/notificacao.store';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-nav.component.html',
  styleUrls: ['./bottom-nav.component.css']
})
export class BottomNavComponent {
  private router = inject(Router);
  supabase = inject(SupabaseService);
  notificacaoStore = inject(NotificacaoStore);

  private rotasOcultasDesktop = ['/login', '/cadastro-usuario'];
  private rotasOcultasMobile = ['/login', '/cadastro-usuario', '/chat'];

  visivelDesktop = signal(true);
  visivelMobile = signal(true);

  visivel = signal(true);

  constructor() {
    this.atualizar(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.atualizar(e.urlAfterRedirects));
  }

  private atualizar(url: string) {
    this.visivelDesktop.set(!this.rotasOcultasDesktop.some(r => url.startsWith(r)));
    this.visivelMobile.set(!this.rotasOcultasMobile.some(r => url.startsWith(r)));
    this.visivel.set(this.visivelDesktop() || this.visivelMobile());
  }
}
