import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Agendamento, StatusAgendamento } from '../../models/interfaces';
import { iconeServico } from '../../utils/servico.util';
import { logError } from '../../utils/logger.util';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './agenda.component.html',
  styleUrls: ['./agenda.component.css']
})
export class AgendaComponent implements OnInit {
  private supabase = inject(SupabaseService);

  isLoading = signal(true);
  agendamentos = signal<Agendamento[]>([]);
  isLoggedIn = computed(() => this.supabase.currentUser() !== null);

  filtro = signal<'Próximos' | 'Histórico'>('Próximos');

  agendamentosFiltrados = computed<Agendamento[]>(() => {
    const finais: StatusAgendamento[] = ['Concluído', 'Cancelado'];
    return this.agendamentos().filter(a =>
      this.filtro() === 'Próximos' ? !finais.includes(a.status) : finais.includes(a.status)
    );
  });

  ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) { this.isLoading.set(false); return; }

    
    this.supabase.getAgendamentosByUser(user.id_user!).subscribe({
      next: ags => {
        this.agendamentos.set(ags);
        this.isLoading.set(false);
      },
      error: err => { logError(err); this.isLoading.set(false); }
    });
  }

  cancelar(a: Agendamento) {
    if (!a.id_agendamento) return;
    this.supabase.cancelarAgendamento(a.id_agendamento).subscribe({
      next: () => {
        this.agendamentos.update(list =>
          list.map(x => x.id_agendamento === a.id_agendamento ? { ...x, status: 'Cancelado' as StatusAgendamento } : x)
        );
        const user = this.supabase.currentUser();
        if (user) {
          this.supabase.createNotificacao({
            id_user: user.id_user!,
            tipo: 'agendamento',
            titulo: 'Agendamento cancelado',
            mensagem: `O ${a.tipo_servico} com ${a.nome_cuidador} foi cancelado.`,
            lida: false,
            id_agendamento: a.id_agendamento
          }).subscribe({ error: e => logError(e) });

          this.supabase.createNotificacao({
            id_cuidador: a.id_cuidador,
            tipo: 'agendamento',
            titulo: 'Agendamento cancelado',
            mensagem: `${user.nome} cancelou o ${a.tipo_servico} de ${a.nome_pet}.`,
            lida: false,
            id_agendamento: a.id_agendamento
          }).subscribe({ error: e => logError(e) });
        }
      },
      error: e => logError(e)
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
}
