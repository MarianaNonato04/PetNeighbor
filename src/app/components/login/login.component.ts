import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';

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

  loginForm: FormGroup;
  isSubmitting = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const { email, senha } = this.loginForm.value;

      this.supabase.login(email, senha).subscribe({
        next: (users) => {
          if (users && users.length > 0) {
            this.router.navigate(['/']);
          } else {
            this.errorMessage.set('E-mail ou senha incorretos.');
            this.isSubmitting.set(false);
          }
        },
        error: (err) => {
          console.error(err);
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
