import { Injectable, computed, signal, inject } from '@angular/core';
import { SupabaseService, Cancelar } from './supabase.service';
import { Notificacao } from '../models/interfaces';
import { logError } from '../utils/logger.util';

@Injectable({ providedIn: 'root' })
export class NotificacaoStore {
  private supabase = inject(SupabaseService);

  notificacoes = signal<Notificacao[]>([]);
  naoLidas = computed(() => this.notificacoes().filter(n => !n.lida).length);

  private cancelarAssinatura?: Cancelar;
  private userIdAtivo: number | null = null;

  iniciar(userId: number) {
    if (this.userIdAtivo === userId) return;
    this.parar();
    this.userIdAtivo = userId;

    this.supabase.getNotificacoes(userId).subscribe({
      next: data => this.notificacoes.set((data || []).filter(n => n.tipo !== 'mensagem')),
      error: err => logError(err)
    });

    this.cancelarAssinatura = this.supabase.subscribeNotificacoes(userId, nova => {
      if (nova.tipo === 'mensagem') return;
      this.notificacoes.update(list =>
        list.some(n => n.id_notificacao === nova.id_notificacao) ? list : [nova, ...list]
      );
    });
  }

  marcarLida(n: Notificacao) {
    if (!n.id_notificacao || n.lida) return;
    this.supabase.marcarNotificacaoLida(n.id_notificacao).subscribe({
      next: () => this.notificacoes.update(list =>
        list.map(x => x.id_notificacao === n.id_notificacao ? { ...x, lida: true } : x)
      ),
      error: err => logError(err)
    });
  }

  marcarTodasLidas() {
    const ids = this.notificacoes().filter(n => !n.lida && n.id_notificacao).map(n => n.id_notificacao!);
    if (ids.length === 0) return;
    this.supabase.marcarNotificacoesLidas(ids).subscribe({
      next: () => this.notificacoes.update(list =>
        list.map(x => ids.includes(x.id_notificacao!) ? { ...x, lida: true } : x)
      ),
      error: err => logError(err)
    });
  }

  parar() {
    this.cancelarAssinatura?.();
    this.cancelarAssinatura = undefined;
    this.userIdAtivo = null;
    this.notificacoes.set([]);
  }
}
