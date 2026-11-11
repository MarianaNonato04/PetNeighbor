import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { environment } from '../../../environments/environment';
import { LIMITES } from '../../utils/limits';
import { logError } from '../../utils/logger.util';

export function senhasIguais(g: AbstractControl): ValidationErrors | null {
  return g.get('senha')?.value === g.get('confirmacao')?.value ? null : { diferentes: true };
}

@Component({
  selector: 'app-redefinir-senha',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './redefinir-senha.component.html',
  styleUrls: ['../login/login.component.css']
})
export class RedefinirSenhaComponent {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  readonly disponivel = environment.recuperacaoSenha;
  readonly limites = LIMITES;
  form = inject(FormBuilder).nonNullable.group({
    senha: ['', [Validators.required, Validators.minLength(LIMITES.senhaMin), Validators.maxLength(LIMITES.senhaMax)]],
    confirmacao: ['', Validators.required]
  }, { validators: senhasIguais });
  salvando = signal(false);
  erro = signal('');

  salvar() {
    if (!this.disponivel || this.form.invalid || this.salvando()) { this.form.markAllAsTouched(); return; }
    this.salvando.set(true);
    this.erro.set('');
    this.supabase.redefinirSenha(this.form.getRawValue().senha)
      .then(() => this.router.navigate(['/login']))
      .catch(err => { logError(err); this.erro.set('O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".'); })
      .finally(() => this.salvando.set(false));
  }
}
