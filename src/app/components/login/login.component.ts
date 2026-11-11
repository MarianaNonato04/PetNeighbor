import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  
  papel: 'tutor' | 'cuidador' = this.route.snapshot.data?.['papel'] === 'cuidador' ? 'cuidador' : 'tutor';

  loginForm: FormGroup;
  isSubmitting = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(LIMITES.email)]],
      senha: ['', [Validators.required, Validators.maxLength(LIMITES.senhaMax)]]
    });
  }

  
  private urlRetorno(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    const padrao = this.papel === 'cuidador' ? '/area-cuidador' : '/';
    return url && url.startsWith('/') && !url.startsWith('//') ? url : padrao;
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const { senha } = this.loginForm.value;
      const email = this.loginForm.value.email.trim().toLowerCase();

      const login$: Observable<unknown[]> = this.papel === 'cuidador'
        ? this.supabase.loginCuidador(email, senha)
        : this.supabase.login(email, senha);

      login$.subscribe({
        next: (rows: unknown[]) => {
          if (rows && rows.length > 0) {
            this.router.navigateByUrl(this.urlRetorno());
          } else {
            this.errorMessage.set('E-mail ou senha incorretos.');
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          logError(err);
          this.errorMessage.set('Ocorreu um erro ao tentar entrar. Tente novamente.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  hasError(controlName: string, errorName: string) {
    const control = this.loginForm.get(controlName);
    return control?.touched && control?.hasError(errorName);
  }
}
