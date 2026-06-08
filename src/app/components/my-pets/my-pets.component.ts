import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Pet } from '../../models/interfaces';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-my-pets',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-pets.component.html',
  styleUrls: ['./my-pets.component.css']
})
export class MyPetsComponent implements OnInit {
  private supabase = inject(SupabaseService);

  pets = signal<Pet[]>([]);
  isLoading = signal(true);
  isUserLoggedIn = computed(() => this.supabase.currentUser() !== null);

  ngOnInit() {
    this.fetchPets();
  }

  fetchPets() {
    const user = this.supabase.currentUser();
    if (user && user.id_user) {
      this.isLoading.set(true);
      this.supabase.getPetsByUser(user.id_user).subscribe({
        next: (data) => {
          this.pets.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }
}
