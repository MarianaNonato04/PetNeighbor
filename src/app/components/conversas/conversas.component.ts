import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Mensagem, Cuidador } from '../../models/interfaces';

interface ConversaItem {
  idCuidador: number;
  cuidadorNome: string;
  cuidadorFoto?: string;
  ultimaMensagem: Mensagem;
}

@Component({
  selector: 'app-conversas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conversas.component.html',
  styleUrls: ['./conversas.component.css']
})
export class ConversasComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  isLoggedIn = computed(() => this.supabase.currentUser() !== null);
  conversas = signal<ConversaItem[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit() {
    const user = this.supabase.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    if (user.id_user) {
      this.carregarConversas(user.id_user);
    } else {
      this.isLoading.set(false);
    }
  }

  carregarConversas(userId: number) {
    this.isLoading.set(true);
    this.errorMessage.set('');

    // Busca todas as mensagens do tutor
    this.supabase.getConversasByUser(userId).subscribe({
      next: (mensagens) => {
        if (!mensagens || mensagens.length === 0) {
          this.conversas.set([]);
          this.isLoading.set(false);
          return;
        }

        // Busca a lista de cuidadores para mapear nomes e fotos
        this.supabase.getCuidadores().subscribe({
          next: (cuidadores) => {
            const grouped = new Map<number, Mensagem>();

            // As mensagens já vêm ordenadas por data descrescente (SupabaseService ordena por data descrescente),
            // então a primeira ocorrência de cada id_cuidador na iteração é a mensagem mais recente.
            for (const m of mensagens) {
              if (!grouped.has(m.id_cuidador)) {
                grouped.set(m.id_cuidador, m);
              }
            }

            const items: ConversaItem[] = [];
            grouped.forEach((lastMsg, idCuidador) => {
              const cuidador = cuidadores.find(c => c.id_cuidador === idCuidador);
              items.push({
                idCuidador,
                cuidadorNome: cuidador ? cuidador.nome : 'Cuidador',
                cuidadorFoto: cuidador?.foto_url,
                ultimaMensagem: lastMsg
              });
            });

            // Ordena as conversas pela data da última mensagem (decrescente)
            items.sort((a, b) => {
              const dateA = a.ultimaMensagem.created_at ? new Date(a.ultimaMensagem.created_at).getTime() : 0;
              const dateB = b.ultimaMensagem.created_at ? new Date(b.ultimaMensagem.created_at).getTime() : 0;
              return dateB - dateA;
            });

            this.conversas.set(items);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Erro ao buscar cuidadores:', err);
            this.errorMessage.set('Erro ao carregar detalhes das conversas.');
            this.isLoading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('Erro ao buscar mensagens:', err);
        this.errorMessage.set('Erro ao carregar conversas.');
        this.isLoading.set(false);
      }
    });
  }

  tempoRelativo(iso?: string): string {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return `${d} d`;
  }
}
