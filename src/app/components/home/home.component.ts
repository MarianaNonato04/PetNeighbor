import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { NotificacaoStore } from '../../services/notificacao.store';
import { Agendamento, Cuidador, Pet, TipoServico } from '../../models/interfaces';
import { hojeLocal } from '../../utils/date.util';
import { fotoSegura } from '../../utils/foto.util';
import { logError } from '../../utils/logger.util';

export function proximoAgendamento(ags: Agendamento[], hoje = hojeLocal()): Agendamento | null {
  return ags
    .filter(a => a.data >= hoje && (a.status === 'Pendente' || a.status === 'Confirmado' || a.status === 'Em andamento'))
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0] ?? null;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  supabase = inject(SupabaseService);
  private store = inject(NotificacaoStore);
  naoLidas = this.store.naoLidas;
  fotoSegura = fotoSegura;

  readonly passos = [
    { icone: 'travel_explore', titulo: 'Encontre um cuidador', texto: 'Veja quem atende perto de você, os serviços e os preços.' },
    { icone: 'event_available', titulo: 'Agende o serviço', texto: 'Escolha o pet, o dia e o horário. O cuidador confirma o pedido.' },
    { icone: 'forum', titulo: 'Combine pelo chat', texto: 'Tire dúvidas e alinhe os detalhes direto com o cuidador.' }
  ];

  readonly servicos: { nome: TipoServico; icone: string; texto: string }[] = [
    { nome: 'Passeio', icone: 'directions_walk', texto: 'Caminhadas no seu horário' },
    { nome: 'Alimentação', icone: 'restaurant', texto: 'Refeições e água em dia' },
    { nome: 'Companhia', icone: 'favorite', texto: 'Alguém por perto enquanto você sai' }
  ];

  proximo = signal<Agendamento | null>(null);
  pets = signal<Pet[]>([]);
  cuidadores = signal<Cuidador[]>([]);
  carregando = signal(false);

  constructor() {
    effect(() => {
      const id = this.supabase.currentUser()?.id_user;
      this.proximo.set(null);
      this.pets.set([]);
      this.cuidadores.set([]);
      if (id) this.carregar(id);
    });
  }

  private carregar(idUser: number) {
    this.carregando.set(true);
    this.supabase.getAgendamentosByUser(idUser).subscribe({
      next: ags => { this.proximo.set(proximoAgendamento(ags)); this.carregando.set(false); },
      error: err => { logError(err); this.carregando.set(false); }
    });
    this.supabase.getPetsByUser(idUser).subscribe({
      next: pets => this.pets.set(pets),
      error: err => logError(err)
    });
    this.supabase.getCuidadores().subscribe({
      next: cs => this.cuidadores.set(cs.slice(0, 3)),
      error: err => logError(err)
    });
  }

  formatData(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  iconeServico(s: string): string {
    return this.servicos.find(x => x.nome === s)?.icone ?? 'pets';
  }
}
