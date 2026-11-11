import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { environment } from '../../../environments/environment';
import { LIMITES } from '../../utils/limits';
import { logError } from '../../utils/logger.util';

@Component({
  selector: 'app-esqueci-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './esqueci-senha.component.html',
  styleUrls: ['../login/login.component.css']
})
export class EsqueciSenhaComponent {
  private supabase = inject(SupabaseService);

  readonly disponivel = environment.recuperacaoSenha;
  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(LIMITES.email)]]
  });
  enviando = signal(false);
  enviado = signal(false);
  erro = signal('');

  enviar() {
    if (!this.disponivel || this.form.invalid || this.enviando()) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    this.erro.set('');
    this.supabase.solicitarRecuperacaoSenha(this.form.getRawValue().email.trim().toLowerCase())
      .then(() => this.enviado.set(true))
      .catch(err => { logError(err); this.erro.set('Não foi possível enviar agora. Tente novamente em alguns minutos.'); })
      .finally(() => this.enviando.set(false));
  }
}
