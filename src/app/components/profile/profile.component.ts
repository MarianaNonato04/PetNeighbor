import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { logError } from '../../utils/logger.util';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  user = computed(() => this.supabase.currentUser());

  excluindo = signal(false);
  erroExclusao = signal('');

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
