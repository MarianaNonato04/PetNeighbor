import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Cuidador, TipoServico, SERVICOS } from '../../models/interfaces';
import { getCurrentPosition } from '../../services/geo.util';

@Component({
  selector: 'app-cuidador-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './cuidador-register.component.html',
  styleUrls: ['./cuidador-register.component.css']
})
export class CuidadorRegisterComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  servicos = SERVICOS;
  form: FormGroup;

  isSubmitting = signal(false);
  showPassword = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  geoStatus = signal<'pendente' | 'ok' | 'erro'>('pendente');
  private coords = signal<{ latitude: number; longitude: number } | null>(null);
  servicosSelecionados = signal<Set<TipoServico>>(new Set());

  constructor() {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      cidade: ['', [Validators.required]],
      bio: ['', [Validators.required, Validators.minLength(10)]],
      documento: ['', [Validators.required]],
      preco_passeio: [30, [Validators.min(0)]],
      preco_alimentacao: [20, [Validators.min(0)]],
      preco_companhia: [25, [Validators.min(0)]]
    });
  }

  togglePassword() { this.showPassword.update(v => !v); }

  toggleServico(s: TipoServico) {
    this.servicosSelecionados.update(set => {
      const novo = new Set(set);
      novo.has(s) ? novo.delete(s) : novo.add(s);
      return novo;
    });
  }

  isServicoSelecionado(s: TipoServico): boolean {
    return this.servicosSelecionados().has(s);
  }

  async capturarLocalizacao() {
    this.geoStatus.set('pendente');
    try {
      const pos = await getCurrentPosition();
      this.coords.set(pos);
      this.geoStatus.set('ok');
    } catch {
      this.geoStatus.set('erro');
    }
  }

  hasError(control: string, error: string): boolean {
    const c = this.form.get(control);
    return !!(c?.touched && c?.hasError(error));
  }

  onSubmit() {
    this.errorMessage.set('');

    if (this.servicosSelecionados().size === 0) {
      this.errorMessage.set('Selecione ao menos um serviço oferecido.');
      return;
    }
    if (!this.coords()) {
      this.errorMessage.set('Capture sua localização para aparecer no Explorar.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const pos = this.coords()!;
    const v = this.form.value;
    const cuidador: Cuidador = {
      nome: v.nome,
      email: v.email,
      senha: v.senha,
      cidade: v.cidade,
      bio: v.bio,
      documento: v.documento,
      latitude: pos.latitude,
      longitude: pos.longitude,
      servicos: Array.from(this.servicosSelecionados()),
      preco_passeio: v.preco_passeio,
      preco_alimentacao: v.preco_alimentacao,
      preco_companhia: v.preco_companhia,
      verificado: false
    };

    this.supabase.registerCuidador(cuidador).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Cadastro realizado! Você já aparece no Explorar.');
        setTimeout(() => this.router.navigate(['/explorar']), 1500);
      },
      error: err => {
        console.error(err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Erro ao cadastrar. Verifique os dados e tente novamente.');
      }
    });
  }
}
