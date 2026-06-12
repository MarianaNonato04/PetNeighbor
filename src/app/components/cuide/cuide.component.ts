import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SupabaseService } from '../../services/supabase.service';
import { Agendamento, Cuidador, Pet, Usuario, StatusAgendamento } from '../../models/interfaces';
interface CalendarDay {
  date: Date;
  dateString: string; 
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasAgendamento: boolean;
}
@Component({
  selector: 'app-cuide',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cuide.component.html',
  styleUrls: ['./cuide.component.css']
})
export class CuideComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  isLoading = signal(true);
  cuidador = computed(() => this.supabase.currentCuidador());
  isLoggedIn = computed(() => this.supabase.currentUser() !== null);
  agendamentos = signal<Agendamento[]>([]);
  tutors = new Map<number, Usuario>();
  pets = new Map<number, Pet>();
  isSubmitting = signal(false);
  activeAgendamento = signal<Agendamento | null>(null);
  activeObservacoes = '';
  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth()); 
  calendarDays = signal<CalendarDay[]>([]);
  selectedDateString = signal<string>('');
  monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  agendamentosFiltrados = computed<Agendamento[]>(() => {
    const list = this.agendamentos();
    const sel = this.selectedDateString();
    if (!sel) return list;
    return list.filter(a => a.data === sel);
  });
  selectedDayLabel = computed<string>(() => {
    const sel = this.selectedDateString();
    if (!sel) return 'Todos os Serviços';
    const [y, m, d] = sel.split('-');
    return `Serviços em ${d}/${m}/${y}`;
  });
  ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.supabase.getCuidadorByEmail(user.email).subscribe({
      next: (cuidadores) => {
        if (!cuidadores || cuidadores.length === 0) {
          this.router.navigate(['/seja-cuidador']);
          return;
        }
        const caregiver = cuidadores[0];
        this.loadCuidadorData(caregiver.id_cuidador!);
      },
      error: (err) => {
        console.error('Erro ao verificar cuidador:', err);
        this.isLoading.set(false);
      }
    });
  }
  loadCuidadorData(cuidadorId: number) {
    this.isLoading.set(true);
    forkJoin({
      ags: this.supabase.getAgendamentosByCuidador(cuidadorId),
      users: this.supabase.getUsuarios(),
      cuidadores: this.supabase.getCuidadores() 
    }).subscribe({
      next: ({ ags, users }) => {
        this.tutors = new Map<number, Usuario>(users.map(u => [u.id_user!, u]));
        const uniqueUserIds = Array.from(new Set((ags || []).map(a => a.id_user)));
        if (uniqueUserIds.length > 0) {
          const petQueries = uniqueUserIds.map(uid => this.supabase.getPetsByUser(uid));
          forkJoin(petQueries).subscribe({
            next: (petsArrays) => {
              const allPets = petsArrays.flat();
              this.pets = new Map<number, Pet>(allPets.map(p => [p.id_pet!, p]));
              this.agendamentos.set(
                (ags || []).map(a => ({
                  ...a,
                  nome_cuidador: this.cuidador()?.nome ?? 'Cuidador',
                  nome_pet: this.pets.get(a.id_pet)?.nome_pet ?? 'Pet'
                }))
              );
              const todayStr = this.formatDateString(new Date());
              this.selectedDateString.set(todayStr);
              this.generateCalendar();
              this.isLoading.set(false);
            },
            error: err => {
              console.error('Erro ao buscar pets dos tutores:', err);
              this.isLoading.set(false);
            }
          });
        } else {
          this.agendamentos.set([]);
          this.selectedDateString.set(this.formatDateString(new Date()));
          this.generateCalendar();
          this.isLoading.set(false);
        }
      },
      error: err => {
        console.error('Erro ao buscar dados do cuidador:', err);
        this.isLoading.set(false);
      }
    });
  }
  generateCalendar() {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); 
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    const days: CalendarDay[] = [];
    const today = new Date();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const d = new Date(year, month - 1, dayNum, 12, 0, 0);
      const dateStr = this.formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        hasAgendamento: this.checkBookingOnDate(dateStr)
      });
    }
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i, 12, 0, 0);
      const dateStr = this.formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: this.isSameDay(d, today),
        hasAgendamento: this.checkBookingOnDate(dateStr)
      });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i, 12, 0, 0);
      const dateStr = this.formatDateString(d);
      days.push({
        date: d,
        dateString: dateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: this.isSameDay(d, today),
        hasAgendamento: this.checkBookingOnDate(dateStr)
      });
    }
    this.calendarDays.set(days);
  }
  prevMonth() {
    this.currentMonth.update(m => {
      if (m === 0) {
        this.currentYear.update(y => y - 1);
        return 11;
      }
      return m - 1;
    });
    this.generateCalendar();
  }
  nextMonth() {
    this.currentMonth.update(m => {
      if (m === 11) {
        this.currentYear.update(y => y + 1);
        return 0;
      }
      return m + 1;
    });
    this.generateCalendar();
  }
  selectDay(day: CalendarDay) {
    this.selectedDateString.set(day.dateString);
    if (!day.isCurrentMonth) {
      this.currentYear.set(day.date.getFullYear());
      this.currentMonth.set(day.date.getMonth());
      this.generateCalendar();
    }
  }
  clearDateFilter() {
    this.selectedDateString.set('');
  }
  formatDateString(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
  checkBookingOnDate(dateStr: string): boolean {
    const finales: StatusAgendamento[] = ['Cancelado'];
    return this.agendamentos().some(a => a.data === dateStr && !finales.includes(a.status));
  }
  getTutorName(userId: number): string {
    return this.tutors.get(userId)?.nome ?? 'Tutor';
  }
  getPetBreed(petId: number): string {
    return this.pets.get(petId)?.especie ?? 'Pet';
  }
  atualizarStatus(a: Agendamento, novoStatus: StatusAgendamento) {
    if (!a.id_agendamento) return;
    this.supabase.updateAgendamentoStatus(a.id_agendamento, novoStatus).subscribe({
      next: () => {
        this.agendamentos.update(list =>
          list.map(x => x.id_agendamento === a.id_agendamento ? { ...x, status: novoStatus } : x)
        );
        this.generateCalendar();
        const tutorId = a.id_user;
        const cuidadorNome = this.cuidador()?.nome ?? 'Cuidador';
        let titulo = '';
        let mensagem = '';
        switch (novoStatus) {
          case 'Confirmado':
            titulo = 'Serviço Confirmado! 🗓️';
            mensagem = `O cuidador ${cuidadorNome} aceitou o serviço de ${a.tipo_servico} para o pet ${a.nome_pet}.`;
            break;
          case 'Em andamento':
            titulo = 'Serviço Iniciado! 🐾';
            mensagem = `O cuidador ${cuidadorNome} iniciou o serviço de ${a.tipo_servico} com ${a.nome_pet}.`;
            break;
          case 'Concluído':
            titulo = 'Serviço Concluído! 🎉';
            mensagem = `O cuidador ${cuidadorNome} concluiu o serviço de ${a.tipo_servico} com ${a.nome_pet}.`;
            break;
          case 'Cancelado':
            titulo = 'Serviço Recusado/Cancelado ❌';
            mensagem = `O cuidador ${cuidadorNome} cancelou o serviço de ${a.tipo_servico} para o pet ${a.nome_pet}.`;
            break;
        }
        this.supabase.createNotificacao({
          id_user: tutorId,
          tipo: 'agendamento',
          titulo,
          mensagem,
          lida: false,
          id_agendamento: a.id_agendamento
        }).subscribe({
          error: err => console.error('Erro ao notificar tutor:', err)
        });
      },
      error: err => console.error('Erro ao atualizar agendamento:', err)
    });
  }
  abrirConclusao(a: Agendamento) {
    this.activeAgendamento.set(a);
    this.activeObservacoes = a.observacoes || '';
  }
  confirmarConclusao(a: Agendamento) {
    if (!a.id_agendamento) return;
    this.isSubmitting.set(true);
    const obs = this.activeObservacoes;
    const novoStatus: StatusAgendamento = 'Concluído';
    this.supabase.updateAgendamento(a.id_agendamento, { status: novoStatus, observacoes: obs }).subscribe({
      next: () => {
        this.agendamentos.update(list =>
          list.map(x => x.id_agendamento === a.id_agendamento ? { ...x, status: novoStatus, observacoes: obs } : x)
        );
        this.generateCalendar();
        const tutorId = a.id_user;
        const cuidadorNome = this.cuidador()?.nome ?? 'Cuidador';
        const titulo = 'Serviço Concluído! 🎉';
        const mensagem = `O cuidador ${cuidadorNome} concluiu o serviço de ${a.tipo_servico} com ${a.nome_pet}. Observações: ${obs}`;
        this.supabase.createNotificacao({
          id_user: tutorId,
          tipo: 'agendamento',
          titulo,
          mensagem,
          lida: false,
          id_agendamento: a.id_agendamento
        }).subscribe({
          error: err => console.error('Erro ao notificar tutor:', err)
        });
        this.isSubmitting.set(false);
        this.activeAgendamento.set(null);
      },
      error: err => {
        console.error('Erro ao concluir agendamento:', err);
        this.isSubmitting.set(false);
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
  iconeServico(s: string): string {
    return s === 'Passeio' ? 'directions_walk' : s === 'Alimentação' ? 'restaurant' : 'favorite';
  }
  formatData(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
}
