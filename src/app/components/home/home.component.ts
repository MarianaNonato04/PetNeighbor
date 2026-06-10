import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { NotificacaoStore } from '../../services/notificacao.store';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  supabase = inject(SupabaseService);
  private store = inject(NotificacaoStore);
  naoLidas = this.store.naoLidas;
}
