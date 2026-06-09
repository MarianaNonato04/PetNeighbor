import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { SupabaseService } from './services/supabase.service';
import { NotificacaoStore } from './services/notificacao.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="app-container">
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>

      <app-bottom-nav></app-bottom-nav>
    </div>
  `,
  styles: [`
    .main-content {
      flex: 1;
      padding-bottom: 5.5rem;
      display: flex;
      flex-direction: column;
    }
  `]
})
export class AppComponent {
  title = 'PetNeighbor';

  private supabase = inject(SupabaseService);
  private notificacoes = inject(NotificacaoStore);

  constructor() {

    effect(() => {
      const user = this.supabase.currentUser();
      if (user?.id_user) {
        this.notificacoes.iniciar(user.id_user);
      } else {
        this.notificacoes.parar();
      }
    }, { allowSignalWrites: true });
  }
}
