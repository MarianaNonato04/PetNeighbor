import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { RouterModule } from '@angular/router';
import { logError } from '../../utils/logger.util';
import { LIMITES } from '../../utils/limits';

@Component({
  selector: 'app-pet-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './pet-register.component.html',
  styleUrls: ['./pet-register.component.css']
})
export class PetRegisterComponent {
  private fb = inject(FormBuilder);
  private supabase = inject(SupabaseService);

  petForm: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  readonly limites = LIMITES;
  errorMessage = signal('');

  isUserLoggedIn = computed(() => this.supabase.currentUser() !== null);

  constructor() {
    this.petForm = this.fb.group({
      nome_pet: ['', [Validators.required, Validators.maxLength(LIMITES.nome)]],
      especie: ['', [Validators.required, Validators.maxLength(LIMITES.especie)]],
      idade_pet: ['', [Validators.required, Validators.min(0), Validators.max(LIMITES.idadePetMax)]],
      porte: ['Pequeno', [Validators.required, Validators.pattern(/^(Pequeno|Médio|Grande)$/)]],
      peso: ['', [Validators.required, Validators.min(0.1), Validators.max(LIMITES.pesoMax)]],
      describ_pet: ['', [Validators.required, Validators.maxLength(LIMITES.descricaoPet)]]
    });
  }

  onSubmit() {
    const user = this.supabase.currentUser();
    if (this.petForm.valid && user) {
      this.isSubmitting.set(true);
      this.errorMessage.set('');

      const petData = {
        ...this.petForm.value,
        nome_pet: this.petForm.value.nome_pet.trim(),
        especie: this.petForm.value.especie.trim(),
        id_user: user.id_user
      };

      this.supabase.registerPet(petData).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Pet cadastrado com sucesso!');
          this.petForm.reset({ porte: 'Pequeno' });
        },
        error: (err) => {
          logError(err);
          this.isSubmitting.set(false);
          this.errorMessage.set('Erro ao cadastrar pet. Tente novamente.');
        }
      });
    } else {
      this.petForm.markAllAsTouched();
    }
  }
}
