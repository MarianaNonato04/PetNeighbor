import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Mensagem } from '../../models/interfaces';
import { fotoSegura } from '../../utils/foto.util';
import { logError } from '../../utils/logger.util';
import { tempoRelativo } from '../feed/feed.component';

export interface ConversaTutor {
  id_cuidador: number;
  nome: string;
  foto: string | null;
  ultima: string;
  remetente: Mensagem['remetente'];
  created_at?: string;
  naoLidas: number;
}

export function agruparConversasDoTutor(
  msgs: (Mensagem & { nome_cuidador: string; foto_cuidador: string | null })[]
): ConversaTutor[] {
  const porCuidador = new Map<number, ConversaTutor>();
  for (const m of msgs) {
    const naoLida = m.remetente === 'cuidador' && !m.lida ? 1 : 0;
    const atual = porCuidador.get(m.id_cuidador);
    if (atual) { atual.naoLidas += naoLida; continue; }
    porCuidador.set(m.id_cuidador, {
      id_cuidador: m.id_cuidador, nome: m.nome_cuidador, foto: fotoSegura(m.foto_cuidador),
      ultima: m.conteudo, remetente: m.remetente, created_at: m.created_at, naoLidas: naoLida
    });
  }
  return [...porCuidador.values()];
}

@Component({
  selector: 'app-conversas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conversas.component.html',
  styleUrls: ['../agenda/agenda.component.css', './conversas.component.css']
})
export class ConversasComponent implements OnInit {
  private supabase = inject(SupabaseService);

  readonly tempoRelativo = tempoRelativo;
  conversas = signal<ConversaTutor[]>([]);
  carregando = signal(true);
  erro = signal('');

  ngOnInit() {
    const id = this.supabase.currentUser()?.id_user;
    if (!id) return;
    this.supabase.getConversasDoTutor(id).subscribe({
      next: msgs => { this.conversas.set(agruparConversasDoTutor(msgs)); this.carregando.set(false); },
      error: err => { logError(err); this.erro.set('Não foi possível carregar suas conversas.'); this.carregando.set(false); }
    });
  }
}
