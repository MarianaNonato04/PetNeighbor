import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { Router, RouterModule } from '@angular/router';

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

  logout() {
    this.supabase.logout();
    this.router.navigate(['/cadastro-usuario']);
  }
}
