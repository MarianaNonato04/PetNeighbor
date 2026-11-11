import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedComponent } from '../feed/feed.component';
import { LIMITES } from '../../utils/limits';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { logError } from '../../utils/logger.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, FeedComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  user = computed(() => this.supabase.currentUser());

  excluindo = signal(false);
  erroExclusao = signal('');

  readonly limites = LIMITES;
  qtdPets = signal<number | null>(null);
  qtdAgendamentos = signal<number | null>(null);
  editando = signal(false);
  salvando = signal(false);
  erroEdicao = signal('');
  editNome = '';
  editIdade: number | null = null;

  constructor() {
    effect(() => {
      const id = this.user()?.id_user;
      if (!id) return;
      this.supabase.getPetsByUser(id).subscribe({ next: p => this.qtdPets.set(p.length), error: e => logError(e) });
      this.supabase.getAgendamentosByUser(id).subscribe({ next: a => this.qtdAgendamentos.set(a.length), error: e => logError(e) });
    });
  }

  iniciarEdicao() {
    const u = this.user();
    if (!u) return;
    this.editNome = u.nome;
    this.editIdade = u.idade;
    this.erroEdicao.set('');
    this.editando.set(true);
  }

  salvarPerfil() {
    const id = this.user()?.id_user;
    const nome = this.editNome.trim();
    const idade = Number(this.editIdade);
    if (!id) return;
    if (nome.length < 3 || nome.length > LIMITES.nome || !Number.isInteger(idade) || idade < 1 || idade > LIMITES.idadeMax) {
      this.erroEdicao.set(`Informe um nome com 3 a ${LIMITES.nome} letras e uma idade entre 1 e ${LIMITES.idadeMax}.`);
      return;
    }
    this.salvando.set(true);
    this.supabase.atualizarPerfil(id, { nome, idade }).subscribe({
      next: () => { this.salvando.set(false); this.editando.set(false); },
      error: err => { logError(err); this.salvando.set(false); this.erroEdicao.set('Não foi possível salvar. Tente novamente.'); }
    });
  }

  logout() {
    this.supabase.logout();
    this.router.navigate(['/login']);
  }

  excluirConta() {
    const id = this.user()?.id_user;
    if (!id || this.excluindo()) return;
    if (!confirm('Excluir sua conta? Seus pets, agendamentos e mensagens serão apagados. Isso não pode ser desfeito.')) return;

    this.excluindo.set(true);
    this.erroExclusao.set('');
    this.supabase.excluirConta(id).subscribe({
      next: () => this.router.navigate(['/']),
      error: err => {
        logError(err);
        this.excluindo.set(false);
        this.erroExclusao.set('Não foi possível excluir a conta. Tente novamente.');
      }
    });
  }
}
