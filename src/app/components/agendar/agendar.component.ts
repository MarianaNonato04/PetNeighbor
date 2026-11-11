import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import {
  Cuidador, Pet, TipoServico, Recorrencia, Agendamento
} from '../../models/interfaces';
import { hojeLocal, horaAtual } from '../../utils/date.util';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

const PRECOS: Record<TipoServico, keyof Cuidador> = { 'Passeio': 'preco_passeio', 'Alimentação': 'preco_alimentacao', 'Companhia': 'preco_companhia' };

export function precoPorHora(c: Cuidador | null, servicos: TipoServico[]): number {
  return c ? servicos.reduce((soma, s) => soma + Number(c[PRECOS[s]] ?? 0), 0) : 0;
}

export function proximaHoraCheia(agora = new Date()): [string, string] {
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), agora.getHours() + 1, 0);
  return [hojeLocal(d), horaAtual(d)];
}

@Component({
  selector: 'app-agendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agendar.component.html',
  styleUrls: ['./agendar.component.css']
})
export class AgendarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  cuidador = signal<Cuidador | null>(null);
  pets = signal<Pet[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage = signal('');
  recorrencias: Recorrencia[] = ['Único', 'Diário', 'Semanal'];
  readonly limites = LIMITES;

  petSelecionado = signal<number | null>(null);
  servicosSelecionados = signal<TipoServico[]>([]);
  duracao = signal<number>(1);
  data = signal<string>('');
  hora = signal<string>('09:00');
  recorrencia = signal<Recorrencia>('Único');
  observacoes = signal<string>('');

  servicosDisponiveis = computed<TipoServico[]>(() => this.cuidador()?.servicos ?? []);

  precoPorHora = computed(() => precoPorHora(this.cuidador(), this.servicosSelecionados()));
  precoTotal = computed(() => this.precoPorHora() * this.duracao());

  alternarServico(s: TipoServico) {
    this.servicosSelecionados.update(l => (l.includes(s) ? l.filter(x => x !== s) : [...l, s]));
  }

  ngOnInit() {
    
    const tutor = this.supabase.currentUser();
    if (!tutor) return;

    const [data, hora] = proximaHoraCheia();
    this.data.set(data);
    this.hora.set(hora);

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.supabase.getCuidador(id).subscribe({
      next: data => {
        const c = data?.[0] ?? null;
        this.cuidador.set(c);
        if (c?.servicos?.length) this.servicosSelecionados.set([c.servicos[0]]);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.supabase.getPetsByUser(tutor.id_user!).subscribe({
      next: pets => {
        this.pets.set(pets || []);
        if (pets?.length) this.petSelecionado.set(pets[0].id_pet!);
      }
    });
  }

  hoje(): string {
    return hojeLocal();
  }

  confirmar() {
    this.errorMessage.set('');
    const tutor = this.supabase.currentUser();
    const c = this.cuidador();

    if (!tutor || !c) return;
    if (!this.petSelecionado()) { this.errorMessage.set('Cadastre ou selecione um pet.'); return; }
    if (this.servicosSelecionados().length === 0) { this.errorMessage.set('Selecione pelo menos um serviço.'); return; }
    if (!Number.isInteger(this.duracao()) || this.duracao() < 1 || this.duracao() > 12) { this.errorMessage.set('A duração deve ser de 1 a 12 horas.'); return; }
    if (!this.data()) { this.errorMessage.set('Escolha uma data.'); return; }
    if (this.data() < hojeLocal()) { this.errorMessage.set('A data não pode estar no passado.'); return; }
    if (this.data() === hojeLocal() && this.hora() <= horaAtual()) { this.errorMessage.set('Escolha um horário que ainda não passou.'); return; }
    if (this.observacoes().length > LIMITES.observacoes) {
      this.errorMessage.set(`As observações podem ter no máximo ${LIMITES.observacoes} caracteres.`);
      return;
    }

    this.isSubmitting.set(true);
    const agendamento: Agendamento = {
      id_user: tutor.id_user!,
      id_cuidador: c.id_cuidador!,
      id_pet: this.petSelecionado()!,
      tipo_servico: this.servicosSelecionados().join(', '),
      data: this.data(),
      hora: this.hora(),
      recorrencia: this.recorrencia(),
      preco: this.precoTotal(),
      observacoes: [this.observacoes().trim(), `Duração: ${this.duracao()}h`].filter(Boolean).join(' | '),
      status: 'Pendente'
    };

    this.supabase.createAgendamento(agendamento).subscribe({
      next: created => {

        this.supabase.createNotificacao({
          id_user: tutor.id_user!,
          tipo: 'agendamento',
          titulo: 'Solicitação enviada',
          mensagem: `Seu pedido de ${agendamento.tipo_servico} com ${c.nome} foi enviado e aguarda confirmação.`,
          lida: false,
          id_agendamento: created?.[0]?.id_agendamento
        }).subscribe({ error: e => logError(e) });

        this.supabase.createNotificacao({
          id_cuidador: c.id_cuidador!,
          tipo: 'agendamento',
          titulo: 'Novo pedido',
          mensagem: `${tutor.nome} pediu ${agendamento.tipo_servico} para ${agendamento.data.split('-').reverse().join('/')} às ${agendamento.hora}.`,
          lida: false,
          id_agendamento: created?.[0]?.id_agendamento
        }).subscribe({ error: e => logError(e) });

        this.isSubmitting.set(false);
        this.router.navigate(['/agenda']);
      },
      error: err => {
        logError(err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Não foi possível criar o agendamento. Tente novamente.');
      }
    });
  }
}
