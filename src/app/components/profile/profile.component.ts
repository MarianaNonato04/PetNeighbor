import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { Usuario } from '../../models/interfaces';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  user = computed(() => this.supabase.currentUser());

  editando = signal(false);
  salvando = signal(false);
  erroEdicao = signal('');
  editNome = '';
  editIdade = 0;

  qtdPets = signal(0);
  qtdAgendamentos = signal(0);

  constructor() {
    effect(() => {
      const u = this.user();
      if (u?.id_user) {
        this.carregarEstatisticas(u.id_user);
      }
    }, { allowSignalWrites: true });
  }

  carregarEstatisticas(userId: number) {
    this.supabase.getPetsByUser(userId).subscribe({
      next: pets => this.qtdPets.set(pets?.length ?? 0),
      error: err => console.error('Erro ao buscar pets:', err)
    });

    this.supabase.getAgendamentosByUser(userId).subscribe({
      next: ags => this.qtdAgendamentos.set(ags?.length ?? 0),
      error: err => console.error('Erro ao buscar agendamentos:', err)
    });
  }

  iniciarEdicao(u: Usuario) {
    this.editNome = u.nome;
    this.editIdade = u.idade;
    this.erroEdicao.set('');
    this.editando.set(true);
  }

  cancelarEdicao() {
    this.editando.set(false);
  }

  salvarPerfil(u: Usuario) {
    if (!this.editNome.trim() || this.editIdade <= 0) {
      this.erroEdicao.set('Por favor, preencha todos os campos corretamente.');
      return;
    }

    if (!u.id_user) return;

    this.salvando.set(true);
    this.erroEdicao.set('');

    this.supabase.updateUsuario(u.id_user, {
      nome: this.editNome.trim(),
      idade: this.editIdade
    }).subscribe({
      next: () => {
        this.salvando.set(false);
        this.editando.set(false);
      },
      error: err => {
        console.error(err);
        this.erroEdicao.set('Erro ao atualizar o perfil. Tente novamente.');
        this.salvando.set(false);
      }
    });
  }

  logout() {
    this.supabase.logout();
    this.router.navigate(['/cadastro-usuario']);
  }
}
