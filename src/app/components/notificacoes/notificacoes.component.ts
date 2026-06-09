import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificacaoStore } from '../../services/notificacao.store';
import { SupabaseService } from '../../services/supabase.service';
import { Notificacao } from '../../models/interfaces';

@Component({
  selector: 'app-notificacoes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notificacoes.component.html',
  styleUrls: ['./notificacoes.component.css']
})
export class NotificacoesComponent {
  private store = inject(NotificacaoStore);
  private supabase = inject(SupabaseService);

  isLoggedIn = computed(() => this.supabase.currentUser() !== null);
  notificacoes = this.store.notificacoes;
  naoLidas = this.store.naoLidas;

  marcarLida(n: Notificacao) { this.store.marcarLida(n); }
  marcarTodas() { this.store.marcarTodasLidas(); }

  icone(tipo: Notificacao['tipo']): string {
    return { agendamento: 'event_available', mensagem: 'chat', sistema: 'info' }[tipo];
  }

  tempoRelativo(iso?: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return `${d} d`;
  }
}
