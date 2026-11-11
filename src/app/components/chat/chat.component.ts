import {
  Component, OnInit, OnDestroy, signal, inject, ElementRef, ViewChild, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService, Cancelar } from '../../services/supabase.service';
import { Mensagem } from '../../models/interfaces';
import { logError } from '../../utils/logger.util';
import { fotoSegura } from '../../utils/foto.util';
import { LIMITES } from '../../utils/limits';

type Papel = 'tutor' | 'cuidador';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLDivElement>;

  papel: Papel = 'tutor';
  
  nomeContato = signal('');
  fotoContato = signal<string | null>(null);
  linkVoltar = '/explorar';

  mensagens = signal<Mensagem[]>([]);
  isLoading = signal(true);
  novaMensagem = signal('');
  enviando = signal(false);
  readonly limites = LIMITES;

  private conversaId = '';
  private idUser = 0;
  private idCuidador = 0;
  private cancelarAssinatura?: Cancelar;
  private deveRolar = false;

  ngOnInit() {
    this.papel = this.route.snapshot.data['papel'] === 'cuidador' ? 'cuidador' : 'tutor';
    const idParam = Number(this.route.snapshot.paramMap.get('id'));

    
    if (this.papel === 'tutor') {
      const tutor = this.supabase.currentUser();
      if (!tutor) return;
      this.idUser = tutor.id_user!;
      this.idCuidador = idParam;
      this.linkVoltar = `/cuidador/${idParam}`;
      this.supabase.getCuidador(this.idCuidador).subscribe({
        next: data => {
          this.nomeContato.set(data?.[0]?.nome ?? 'Cuidador');
          this.fotoContato.set(fotoSegura(data?.[0]?.foto_url));
        },
        error: err => logError(err)
      });
    } else {
      const cuidador = this.supabase.currentCuidador();
      if (!cuidador) return;
      this.idCuidador = cuidador.id_cuidador!;
      this.idUser = idParam;
      this.linkVoltar = '/area-cuidador';
      this.supabase.getUsuarioNome(this.idUser).subscribe({
        next: data => this.nomeContato.set(data?.[0]?.nome ?? 'Tutor'),
        error: err => logError(err)
      });
    }

    this.conversaId = this.supabase.buildConversaId(this.idUser, this.idCuidador);

    this.supabase.getMensagens(this.conversaId).subscribe({
      next: msgs => {
        this.mensagens.set(msgs || []);
        this.isLoading.set(false);
        this.deveRolar = true;
        if (msgs?.some(m => !m.lida && !this.ehMinha(m))) this.marcarLidas();
      },
      error: err => { logError(err); this.isLoading.set(false); }
    });

    this.cancelarAssinatura = this.supabase.subscribeMensagens(this.conversaId, msg => {
      this.mensagens.update(list =>
        list.some(m => m.id_mensagem === msg.id_mensagem) ? list : [...list, msg]
      );
      this.deveRolar = true;
      
      if (!this.ehMinha(msg)) this.marcarLidas();
    });
  }

  ngAfterViewChecked() {
    if (this.deveRolar && this.scrollArea) {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
      this.deveRolar = false;
    }
  }

  ngOnDestroy() {
    this.cancelarAssinatura?.();
  }

  ehMinha(m: Mensagem): boolean {
    return m.remetente === this.papel;
  }

  private marcarLidas() {
    const outroLado = this.papel === 'tutor' ? 'cuidador' : 'tutor';
    this.supabase.marcarMensagensLidas(this.conversaId, outroLado).subscribe({ error: e => logError(e) });
  }

  enviar() {
    const texto = this.novaMensagem().trim();
    if (!texto || !this.idUser || !this.idCuidador || this.enviando() || texto.length > LIMITES.mensagem) return;

    this.enviando.set(true);
    const msg: Mensagem = {
      conversa_id: this.conversaId,
      id_user: this.idUser,
      id_cuidador: this.idCuidador,
      remetente: this.papel,
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
        this.notificarDestinatario();
      },
      error: err => {
        logError(err);
        this.enviando.set(false);
      }
    });
  }

  
  private notificarDestinatario() {
    const destino = this.papel === 'cuidador'
      ? { id_user: this.idUser, mensagem: `${this.supabase.currentCuidador()?.nome ?? 'O cuidador'} respondeu sua conversa.` }
      : { id_cuidador: this.idCuidador, mensagem: `${this.supabase.currentUser()?.nome ?? 'Um tutor'} enviou uma mensagem.` };
    this.supabase.createNotificacao({ ...destino, tipo: 'mensagem', titulo: 'Nova mensagem', lida: false })
      .subscribe({ error: e => logError(e) });
  }

  formatHora(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
}
