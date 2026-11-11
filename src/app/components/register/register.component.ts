import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  registerForm: FormGroup;
  isSubmitting = signal(false);
  showPassword = signal(false);
  successMessage = signal('');
  readonly limites = LIMITES;
  errorMessage = signal('');

  constructor() {
    this.registerForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(LIMITES.nome)]],
      idade: ['', [Validators.required, Validators.min(0), Validators.max(LIMITES.idadeMax)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(LIMITES.email)]],
      senha: ['', [Validators.required, Validators.minLength(LIMITES.senhaMin), Validators.maxLength(LIMITES.senhaMax)]],
      
      aceite: [false, [Validators.requiredTrue]]
    });
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const { aceite, ...v } = this.registerForm.value;
      this.supabase.registerUsuario({ ...v, nome: v.nome.trim(), email: v.email.trim().toLowerCase(),
        aceite_privacidade_em: new Date().toISOString() }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Conta criada com sucesso!');
          setTimeout(() => this.router.navigate(['/cadastro-pet']), 1500);
        },
        error: (err) => {
          logError(err);
          this.isSubmitting.set(false);
          this.errorMessage.set('Erro ao criar conta. Tente outro e-mail.');
        }
      });
    } else {
      this.registerForm.markAllAsTouched();
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  hasError(controlName: string, errorName: string) {
    const control = this.registerForm.get(controlName);
    return control?.touched && control?.hasError(errorName);
  }
}
