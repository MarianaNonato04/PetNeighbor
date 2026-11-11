import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import {
  Cuidador, Pet, TipoServico, Recorrencia, Agendamento
} from '../../models/interfaces';
import { hojeLocal } from '../../utils/date.util';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

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
  servicoSelecionado = signal<TipoServico | null>(null);
  data = signal<string>('');
  hora = signal<string>('09:00');
  recorrencia = signal<Recorrencia>('Único');
  observacoes = signal<string>('');

  servicosDisponiveis = computed<TipoServico[]>(() => this.cuidador()?.servicos ?? []);

  precoSelecionado = computed<number>(() => {
    const c = this.cuidador();
    const s = this.servicoSelecionado();
    if (!c || !s) return 0;
    return { 'Passeio': c.preco_passeio, 'Alimentação': c.preco_alimentacao, 'Companhia': c.preco_companhia }[s];
  });

  ngOnInit() {
    
    const tutor = this.supabase.currentUser();
    if (!tutor) return;

    this.data.set(hojeLocal());

    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.supabase.getCuidador(id).subscribe({
      next: data => {
        const c = data?.[0] ?? null;
        this.cuidador.set(c);
        if (c?.servicos?.length) this.servicoSelecionado.set(c.servicos[0]);
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
    if (!this.servicoSelecionado()) { this.errorMessage.set('Selecione um serviço.'); return; }
    if (!this.data()) { this.errorMessage.set('Escolha uma data.'); return; }
    if (this.data() < hojeLocal()) { this.errorMessage.set('A data não pode estar no passado.'); return; }
    if (this.observacoes().length > LIMITES.observacoes) {
      this.errorMessage.set(`As observações podem ter no máximo ${LIMITES.observacoes} caracteres.`);
      return;
    }

    this.isSubmitting.set(true);
    const agendamento: Agendamento = {
      id_user: tutor.id_user!,
      id_cuidador: c.id_cuidador!,
      id_pet: this.petSelecionado()!,
      tipo_servico: this.servicoSelecionado()!,
      data: this.data(),
      hora: this.hora(),
      recorrencia: this.recorrencia(),
      preco: this.precoSelecionado(),
      observacoes: this.observacoes().trim(),
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
