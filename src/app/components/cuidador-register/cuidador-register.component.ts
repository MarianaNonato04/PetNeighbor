import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Cuidador, TipoServico, SERVICOS } from '../../models/interfaces';
import { getCurrentPosition, arredondarCoord } from '../../services/geo.util';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

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
  readonly limites = LIMITES;
  errorMessage = signal('');

  geoStatus = signal<'pendente' | 'ok' | 'erro'>('pendente');
  private coords = signal<{ latitude: number; longitude: number } | null>(null);
  servicosSelecionados = signal<Set<TipoServico>>(new Set());

  constructor() {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(LIMITES.nome)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(LIMITES.email)]],
      senha: ['', [Validators.required, Validators.minLength(LIMITES.senhaMin), Validators.maxLength(LIMITES.senhaMax)]],
      cidade: ['', [Validators.required, Validators.maxLength(LIMITES.cidade)]],
      bio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(LIMITES.bio)]],
      documento: ['', [Validators.required, Validators.maxLength(LIMITES.documento)]],
      preco_passeio: [30, [Validators.min(0), Validators.max(LIMITES.precoMax)]],
      preco_alimentacao: [20, [Validators.min(0), Validators.max(LIMITES.precoMax)]],
      preco_companhia: [25, [Validators.min(0), Validators.max(LIMITES.precoMax)]],
      aceite: [false, [Validators.requiredTrue]]
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
      this.errorMessage.set(this.form.get('aceite')?.invalid
        ? 'É preciso aceitar a Política de Privacidade para continuar.'
        : `Verifique os campos: textos dentro do limite e preços entre R$ 0 e R$ ${LIMITES.precoMax}.`);
      return;
    }

    this.isSubmitting.set(true);
    const pos = this.coords()!;
    const v = this.form.value;
    const cuidador: Cuidador = {
      nome: v.nome.trim(),
      email: v.email.trim().toLowerCase(),
      senha: v.senha,
      cidade: v.cidade,
      bio: v.bio,
      documento: v.documento,
      
      
      latitude: arredondarCoord(pos.latitude),
      longitude: arredondarCoord(pos.longitude),
      servicos: Array.from(this.servicosSelecionados()),
      preco_passeio: v.preco_passeio,
      preco_alimentacao: v.preco_alimentacao,
      preco_companhia: v.preco_companhia,
      aceite_privacidade_em: new Date().toISOString()
    };

    this.supabase.registerCuidador(cuidador).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Cadastro realizado! Você já aparece no Explorar.');
        setTimeout(() => this.router.navigate(['/area-cuidador']), 1500);
      },
      error: err => {
        logError(err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Erro ao cadastrar. Verifique os dados e tente novamente.');
      }
    });
  }
}
