import {
  Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';
import { Cuidador, Mensagem } from '../../models/interfaces';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;

  cuidador = signal<Cuidador | null>(null);
  mensagens = signal<Mensagem[]>([]);
  isLoading = signal(true);
  novaMensagem = signal('');
  enviando = signal(false);

  private conversaId = '';
  private idCuidador = 0;
  private canal?: RealtimeChannel;
  private deveRolar = false;

  ngOnInit() {
    const tutor = this.supabase.currentUser();
    if (!tutor) { this.router.navigate(['/login']); return; }

    this.idCuidador = Number(this.route.snapshot.paramMap.get('id'));
    this.conversaId = this.supabase.buildConversaId(tutor.id_user!, this.idCuidador);

    this.supabase.getCuidador(this.idCuidador).subscribe({
      next: data => this.cuidador.set(data?.[0] ?? null)
    });

    this.supabase.getMensagens(this.conversaId).subscribe({
      next: msgs => {
        this.mensagens.set(msgs || []);
        this.isLoading.set(false);
        this.deveRolar = true;
      },
      error: () => this.isLoading.set(false)
    });

    this.canal = this.supabase.subscribeMensagens(this.conversaId, msg => {
      this.mensagens.update(list =>
        list.some(m => m.id_mensagem === msg.id_mensagem) ? list : [...list, msg]
      );
      this.deveRolar = true;
    });
  }

  ngAfterViewChecked() {
    if (this.deveRolar && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
      this.deveRolar = false;
    }
  }

  ngOnDestroy() {
    if (this.canal) this.supabase.removeChannel(this.canal);
  }

  enviar() {
    const texto = this.novaMensagem().trim();
    const tutor = this.supabase.currentUser();
    if (!texto || !tutor || this.enviando()) return;

    this.enviando.set(true);
    const msg: Mensagem = {
      conversa_id: this.conversaId,
      id_user: tutor.id_user!,
      id_cuidador: this.idCuidador,
      remetente: 'tutor',
      conteudo: texto,
      lida: false
    };

    this.supabase.sendMensagem(msg).subscribe({
      next: created => {

        const salva = created?.[0];
        if (salva) {
          this.mensagens.update(list =>
            list.some(m => m.id_mensagem === salva.id_mensagem) ? list : [...list, salva]
          );
        }
        this.novaMensagem.set('');
        this.enviando.set(false);
        this.deveRolar = true;
      },
      error: err => {
        console.error(err);
        this.enviando.set(false);
      }
    });
  }

  formatHora(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
