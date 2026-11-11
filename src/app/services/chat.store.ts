import { Injectable, inject, signal } from '@angular/core';
import { Cancelar, SupabaseService } from './supabase.service';
import { logError } from '../utils/logger.util';

@Injectable({ providedIn: 'root' })
export class ChatStore {
  private supabase = inject(SupabaseService);

  naoLidas = signal(0);
  conversaAberta = signal<string | null>(null);

  private idUser: number | null = null;
  private cancelar?: Cancelar;

  iniciar(idUser: number) {
    if (this.idUser === idUser) return;
    this.parar();
    this.idUser = idUser;
    this.recarregar();
    this.cancelar = this.supabase.subscribeMensagensDoTutor(idUser, msg => {
      if (msg.remetente === 'cuidador' && !msg.lida && msg.conversa_id !== this.conversaAberta()) {
        this.naoLidas.update(n => n + 1);
      }
    });
  }

  recarregar() {
    if (!this.idUser) return;
    this.supabase.contarNaoLidasDoTutor(this.idUser).subscribe({
      next: n => this.naoLidas.set(n),
      error: err => logError(err)
    });
  }

  parar() {
    this.cancelar?.();
    this.cancelar = undefined;
    this.idUser = null;
    this.naoLidas.set(0);
  }
}
