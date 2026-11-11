import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { hojeLocal } from '../../utils/date.util';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService, Cancelar } from '../../services/supabase.service';
import { Agendamento, Notificacao, StatusAgendamento } from '../../models/interfaces';
import { LIMITES } from '../../utils/limits';
import { iconeServico } from '../../utils/servico.util';
import { logError } from '../../utils/logger.util';

type Aba = 'Pedidos' | 'Ativos' | 'Calendário' | 'Histórico' | 'Conversas';

interface AcaoStatus {
  rotulo: string;
  icone: string;
  novoStatus: StatusAgendamento;
  perigo?: boolean;
}

export interface ResumoConversa {
  id_user: number;
  nome_tutor: string;
  ultima: string;
  created_at?: string;
  remetente: 'tutor' | 'cuidador';
  
  naoLidas: number;
}


const ACOES: Partial<Record<StatusAgendamento, AcaoStatus[]>> = {
  'Pendente': [
    { rotulo: 'Recusar', icone: 'close', novoStatus: 'Cancelado', perigo: true },
    { rotulo: 'Confirmar', icone: 'check', novoStatus: 'Confirmado' }
  ],
  'Confirmado': [
    { rotulo: 'Cancelar', icone: 'close', novoStatus: 'Cancelado', perigo: true },
    { rotulo: 'Iniciar', icone: 'play_arrow', novoStatus: 'Em andamento' }
  ],
  'Em andamento': [
    { rotulo: 'Concluir', icone: 'task_alt', novoStatus: 'Concluído' }
  ]
};

const TEXTO_NOTIFICACAO: Partial<Record<StatusAgendamento, string>> = {
  'Confirmado': 'confirmou',
  'Cancelado': 'cancelou',
  'Em andamento': 'iniciou',
  'Concluído': 'concluiu'
};

@Component({
  selector: 'app-painel-cuidador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './painel-cuidador.component.html',
  styleUrls: ['../agenda/agenda.component.css', './painel-cuidador.component.css']
})
export class PainelCuidadorComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  cuidador = this.supabase.currentCuidador;
  aba = signal<Aba>('Pedidos');
  isLoading = signal(true);
  erro = signal('');
  atualizando = signal<number | null>(null);

  agendamentos = signal<Agendamento[]>([]);
  conversas = signal<ResumoConversa[]>([]);
  
  avisos = signal<Notificacao[]>([]);
  excluindo = signal(false);

  private cancelarAssinatura?: Cancelar;

  readonly meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  mesVisivel = signal(primeiroDoMes(new Date()));
  diaSelecionado = signal(hojeLocal());
  calendario = computed(() => gerarCalendario(this.mesVisivel(), new Set(
    this.agendamentos().filter(a => a.status !== 'Cancelado').map(a => a.data)
  )));

  readonly limites = LIMITES;
  concluindoId = signal<number | null>(null);
  obsConclusao = '';

  agendamentosDaAba = computed<Agendamento[]>(() => {
    const filtros: Record<'Pedidos' | 'Ativos' | 'Histórico', StatusAgendamento[]> = {
      'Pedidos': ['Pendente'],
      'Ativos': ['Confirmado', 'Em andamento'],
      'Histórico': ['Concluído', 'Cancelado']
    };
    const aba = this.aba();
    if (aba === 'Conversas') return [];
    if (aba === 'Calendário') return this.agendamentos().filter(a => a.data === this.diaSelecionado());
    return this.agendamentos().filter(a => filtros[aba].includes(a.status));
  });

  mudarMes(delta: number) {
    const m = this.mesVisivel();
    this.mesVisivel.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  escolherDia(dia: DiaCalendario) {
    this.diaSelecionado.set(dia.data);
    if (!dia.doMes) this.mesVisivel.set(primeiroDoMes(new Date(dia.data + 'T12:00')));
  }

  pendentes = computed(() => this.agendamentos().filter(a => a.status === 'Pendente').length);
  mensagensNaoLidas = computed(() => this.conversas().reduce((t, c) => t + c.naoLidas, 0));

  ngOnInit() {
    this.carregar();
    const id = this.cuidador()?.id_cuidador;
    if (!id) return;

    this.supabase.getNotificacoesCuidador(id).subscribe({
      next: ns => this.avisos.set(ns),
      error: err => logError(err)
    });
    
    this.cancelarAssinatura = this.supabase.subscribeNotificacoesCuidador(id, n => {
      this.avisos.update(list => list.some(x => x.id_notificacao === n.id_notificacao) ? list : [n, ...list]);
      this.carregar(false);
    });
  }

  ngOnDestroy() {
    this.cancelarAssinatura?.();
  }

  limparAvisos() {
    const ids = this.avisos().map(n => n.id_notificacao!).filter(Boolean);
    if (ids.length === 0) return;
    this.supabase.marcarNotificacoesLidas(ids).subscribe({
      next: () => this.avisos.set([]),
      error: err => logError(err)
    });
  }

  carregar(mostrarLoading = true) {
    const c = this.cuidador();
    if (!c?.id_cuidador) return;
    if (mostrarLoading) this.isLoading.set(true);
    this.erro.set('');

    this.supabase.getAgendamentosByCuidador(c.id_cuidador).subscribe({
      next: ags => { this.agendamentos.set(ags); this.isLoading.set(false); },
      error: err => {
        logError(err);
        this.erro.set('Não foi possível carregar seus agendamentos.');
        this.isLoading.set(false);
      }
    });

    this.supabase.getMensagensDoCuidador(c.id_cuidador).subscribe({
      next: msgs => this.conversas.set(agruparConversas(msgs)),
      error: err => logError(err)
    });
  }

  acoes(a: Agendamento): AcaoStatus[] {
    return ACOES[a.status] ?? [];
  }

  executar(a: Agendamento, acao: AcaoStatus, observacoes?: string) {
    const c = this.cuidador();
    if (!c?.id_cuidador || !a.id_agendamento || this.atualizando()) return;
    if (acao.novoStatus === 'Concluído' && observacoes === undefined) {
      this.obsConclusao = a.observacoes ?? '';
      this.concluindoId.set(a.id_agendamento);
      return;
    }
    if (observacoes && observacoes.length > LIMITES.observacoes) {
      this.erro.set(`As observações podem ter no máximo ${LIMITES.observacoes} caracteres.`);
      return;
    }
    this.atualizando.set(a.id_agendamento);

    this.supabase.atualizarStatusComoCuidador(a.id_agendamento, c.id_cuidador, acao.novoStatus, observacoes).subscribe({
      next: () => {
        this.agendamentos.update(list =>
          list.map(x => x.id_agendamento === a.id_agendamento
            ? { ...x, status: acao.novoStatus, ...(observacoes === undefined ? {} : { observacoes }) } : x)
        );
        this.atualizando.set(null);
        this.concluindoId.set(null);
        this.notificarTutor(a, acao.novoStatus, observacoes);
      },
      error: err => {
        logError(err);
        this.erro.set('Não foi possível atualizar o agendamento. Tente novamente.');
        this.atualizando.set(null);
      }
    });
  }

  private notificarTutor(a: Agendamento, status: StatusAgendamento, observacoes?: string) {
    const verbo = TEXTO_NOTIFICACAO[status];
    if (!verbo) return;
    this.supabase.createNotificacao({
      id_user: a.id_user,
      tipo: 'agendamento',
      titulo: `Agendamento ${status.toLowerCase()}`,
      mensagem: `${this.cuidador()?.nome ?? 'O cuidador'} ${verbo} o ${a.tipo_servico} de ${a.nome_pet} em ${this.formatData(a.data)}.`
        + (observacoes ? ` Observações: ${observacoes}` : ''),
      lida: false,
      id_agendamento: a.id_agendamento
    }).subscribe({ error: e => logError(e) });
  }

  sair() {
    this.supabase.logoutCuidador();
    this.router.navigate(['/area-cuidador/login']);
  }

  excluirConta() {
    const id = this.cuidador()?.id_cuidador;
    if (!id || this.excluindo()) return;
    if (!confirm('Excluir sua conta de cuidador? Seus agendamentos e conversas serão apagados. Isso não pode ser desfeito.')) return;

    this.excluindo.set(true);
    this.supabase.excluirContaCuidador(id).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        logError(err);
        this.excluindo.set(false);
        this.erro.set('Não foi possível excluir a conta. Tente novamente.');
      }
    });
  }

  iconeStatus(status: StatusAgendamento): string {
    return {
      'Pendente': 'schedule',
      'Confirmado': 'check_circle',
      'Em andamento': 'pending',
      'Concluído': 'task_alt',
      'Cancelado': 'cancel'
    }[status];
  }

  readonly iconeServico = iconeServico;

  formatData(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  formatQuando(iso?: string): string {
    if (!iso) return '';
    const data = new Date(iso);
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString()
      ? data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
}


export function agruparConversas(
  msgs: { id_user: number; nome_tutor: string; conteudo: string; created_at?: string; remetente: 'tutor' | 'cuidador'; lida?: boolean }[]
): ResumoConversa[] {
  const vistas = new Map<number, ResumoConversa>();
  for (const m of msgs) {
    const naoLida = m.remetente === 'tutor' && !m.lida ? 1 : 0;
    const existente = vistas.get(m.id_user);
    if (existente) { existente.naoLidas += naoLida; continue; }
    vistas.set(m.id_user, {
      id_user: m.id_user,
      nome_tutor: m.nome_tutor,
      ultima: m.conteudo,
      created_at: m.created_at,
      remetente: m.remetente,
      naoLidas: naoLida
    });
  }
  return [...vistas.values()];
}

export interface DiaCalendario { data: string; numero: number; doMes: boolean; hoje: boolean; temServico: boolean; }

export function primeiroDoMes(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function gerarCalendario(mes: Date, datasComServico: Set<string>, hoje = hojeLocal()): DiaCalendario[] {
  const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - mes.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const data = hojeLocal(d);
    return { data, numero: d.getDate(), doMes: d.getMonth() === mes.getMonth(), hoje: data === hoje, temServico: datasComServico.has(data) };
  });
}
