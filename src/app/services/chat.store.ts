import { Injectable, signal, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private supabase = inject(SupabaseService);
  unreadCount = signal<number>(0);
  activeConversaId = signal<string | null>(null);
  private canal?: RealtimeChannel;
  private userIdAtivo: number | null = null;
  iniciar(userId: number) {
    if (this.userIdAtivo === userId) return;
    this.parar();
    this.userIdAtivo = userId;
    this.recarregar();
    this.canal = this.supabase.subscribeAllMensagens((nova) => {
      const caregiver = this.supabase.currentCuidador();
      const caregiverId = caregiver?.id_cuidador;
      const eParaMim = 
        (nova.id_user === userId && nova.remetente === 'cuidador') ||
        (caregiverId && nova.id_cuidador === caregiverId && nova.remetente === 'tutor');
      if (eParaMim && !nova.lida && nova.conversa_id !== this.activeConversaId()) {
        this.unreadCount.update(c => c + 1);
      }
    });
  }
  recarregar() {
    const userId = this.userIdAtivo;
    if (!userId) return;
    const caregiver = this.supabase.currentCuidador();
    const caregiverId = caregiver?.id_cuidador;
    this.supabase.getConversasByUserAndCaregiver(userId, caregiverId).subscribe({
      next: (msgs) => {
        const count = msgs.filter(m => {
          const souTutor = m.id_user === userId;
          const deOutro = m.remetente !== (souTutor ? 'tutor' : 'cuidador');
          return !m.lida && deOutro;
        }).length;
        this.unreadCount.set(count);
      },
      error: err => console.error('Erro ao recarregar unread count:', err)
    });
  }
  parar() {
    if (this.canal) {
      this.supabase.removeChannel(this.canal);
      this.canal = undefined;
    }
    this.userIdAtivo = null;
    this.unreadCount.set(0);
  }
}
