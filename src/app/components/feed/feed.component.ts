import { Component, Input, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Autor, SupabaseService, colunasDoAutor } from '../../services/supabase.service';
import { AutorTipo, Comentario, Post } from '../../models/interfaces';
import { comprimirImagem, fotoPostSegura, fotoSegura } from '../../utils/foto.util';
import { LIMITES } from '../../utils/limits';
import { logError } from '../../utils/logger.util';

interface FotoNova { blob: Blob; preview: string; }

export function tempoRelativo(iso?: string, agora = Date.now()): string {
  if (!iso) return '';
  const min = Math.floor((agora - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.css']
})
export class FeedComponent implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);

  @Input() titulo = 'Feed da comunidade';
  @Input() filtro?: { idUser?: number; idCuidador?: number };
  @Input() permitirPublicar = true;

  readonly limites = LIMITES;
  readonly fotoPostSegura = fotoPostSegura;
  readonly tempoRelativo = tempoRelativo;

  posts = signal<Post[]>([]);
  carregando = signal(true);
  erro = signal('');

  papel = signal<AutorTipo>('tutor');
  temDoisPerfis = computed(() => !!this.supabase.currentUser() && !!this.supabase.currentCuidador());
  autor = computed<Autor | null>(() => {
    const tutor = this.supabase.currentUser();
    const cuidador = this.supabase.currentCuidador();
    const papel = tutor && cuidador ? this.papel() : tutor ? 'tutor' : cuidador ? 'cuidador' : null;
    if (papel === 'tutor' && tutor) return { autor_tipo: 'tutor', id_user: tutor.id_user };
    if (papel === 'cuidador' && cuidador) return { autor_tipo: 'cuidador', id_cuidador: cuidador.id_cuidador };
    return null;
  });
  nomeAutor = computed(() => this.autor()?.autor_tipo === 'cuidador'
    ? this.supabase.currentCuidador()?.nome ?? ''
    : this.supabase.currentUser()?.nome ?? '');
  fotoAutor = computed(() => this.autor()?.autor_tipo === 'cuidador' ? fotoSegura(this.supabase.currentCuidador()?.foto_url) : null);

  texto = signal('');
  fotos = signal<FotoNova[]>([]);
  publicando = signal(false);

  menuAberto = signal<number | null>(null);
  editandoId = signal<number | null>(null);
  editTexto = signal('');
  editFotos = signal<string[]>([]);

  comentariosAbertos = signal<number | null>(null);
  comentarios = signal<Map<number, Comentario[]>>(new Map());
  carregandoComentarios = signal(false);
  rascunhos = signal<Map<number, string>>(new Map());
  slides = signal<Map<number, number>>(new Map());

  private curtidos = signal<Set<number>>(new Set());

  ngOnInit() {
    this.carregar();
  }

  ngOnDestroy() {
    this.fotos().forEach(f => URL.revokeObjectURL(f.preview));
  }

  carregar() {
    this.carregando.set(true);
    this.erro.set('');
    this.supabase.getPosts(this.filtro).subscribe({
      next: posts => { this.posts.set(posts); this.carregando.set(false); },
      error: err => { logError(err); this.erro.set('Não foi possível carregar as publicações.'); this.carregando.set(false); }
    });
    const autor = this.autor();
    if (autor) {
      this.supabase.idsCurtidos(autor).subscribe({
        next: ids => this.curtidos.set(new Set(ids)),
        error: err => logError(err)
      });
    }
  }

  trocarPapel(papel: AutorTipo) {
    this.papel.set(papel);
    this.carregar();
  }

  curtido(post: Post): boolean {
    return this.curtidos().has(post.id_post!);
  }

  podeEditar(post: Post): boolean {
    const tutor = this.supabase.currentUser();
    const cuidador = this.supabase.currentCuidador();
    return post.autor_tipo === 'tutor'
      ? !!tutor && post.id_user === tutor.id_user
      : !!cuidador && post.id_cuidador === cuidador.id_cuidador;
  }

  async adicionarFotos(evento: Event, edicao = false) {
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []).filter(f => f.type.startsWith('image/'));
    input.value = '';
    const atuais = edicao ? this.editFotos().length : this.fotos().length;
    const livres = LIMITES.fotosPorPost - atuais;
    try {
      for (const arquivo of arquivos.slice(0, livres)) {
        const blob = await comprimirImagem(arquivo);
        if (edicao) {
          this.editFotos.update(l => [...l, '']);
          const url = await this.supabase.enviarFotoPost(blob);
          this.editFotos.update(l => l.map(u => (u === '' ? url : u)));
        } else {
          this.fotos.update(l => [...l, { blob, preview: URL.createObjectURL(blob) }]);
        }
      }
    } catch (err) {
      logError(err);
      this.editFotos.update(l => l.filter(u => u !== ''));
      this.erro.set('Não foi possível adicionar a foto. Tente outra imagem.');
    }
  }

  removerFoto(i: number) {
    URL.revokeObjectURL(this.fotos()[i].preview);
    this.fotos.update(l => l.filter((_, idx) => idx !== i));
  }

  async publicar() {
    const autor = this.autor();
    const descricao = this.texto().trim();
    if (!autor || !descricao || descricao.length > LIMITES.post || this.publicando()) return;
    this.publicando.set(true);
    this.erro.set('');
    try {
      const urls: string[] = [];
      for (const f of this.fotos()) urls.push(await this.supabase.enviarFotoPost(f.blob));
      this.supabase.criarPost({ ...colunasDoAutor(autor), descricao, fotos: urls }).subscribe({
        next: ([criado]) => {
          if (criado) this.posts.update(l => [criado, ...l]);
          this.fotos().forEach(f => URL.revokeObjectURL(f.preview));
          this.fotos.set([]);
          this.texto.set('');
          this.publicando.set(false);
        },
        error: err => {
          logError(err);
          this.supabase.removerFotos(urls);
          this.erro.set('Não foi possível publicar. Tente novamente.');
          this.publicando.set(false);
        }
      });
    } catch (err) {
      logError(err);
      this.erro.set('Não foi possível enviar as fotos. Tente novamente.');
      this.publicando.set(false);
    }
  }

  curtir(post: Post) {
    const autor = this.autor();
    if (!autor || !post.id_post) return;
    const curtir = !this.curtido(post);
    this.marcarCurtida(post, curtir);
    (curtir ? this.supabase.curtir(post.id_post, autor) : this.supabase.descurtir(post.id_post, autor)).subscribe({
      error: err => { logError(err); this.marcarCurtida(post, !curtir); }
    });
  }

  private marcarCurtida(post: Post, curtido: boolean) {
    this.curtidos.update(s => {
      const n = new Set(s);
      curtido ? n.add(post.id_post!) : n.delete(post.id_post!);
      return n;
    });
    this.posts.update(l => l.map(p => p.id_post === post.id_post
      ? { ...p, qtd_curtidas: Math.max(0, (p.qtd_curtidas ?? 0) + (curtido ? 1 : -1)) } : p));
  }

  alternarComentarios(post: Post) {
    const id = post.id_post!;
    if (this.comentariosAbertos() === id) { this.comentariosAbertos.set(null); return; }
    this.comentariosAbertos.set(id);
    this.carregandoComentarios.set(true);
    this.supabase.getComentarios(id).subscribe({
      next: lista => { this.comentarios.update(m => new Map(m).set(id, lista)); this.carregandoComentarios.set(false); },
      error: err => { logError(err); this.carregandoComentarios.set(false); }
    });
  }

  rascunho(id: number): string {
    return this.rascunhos().get(id) ?? '';
  }

  setRascunho(id: number, valor: string) {
    this.rascunhos.update(m => new Map(m).set(id, valor));
  }

  comentar(post: Post) {
    const autor = this.autor();
    const id = post.id_post!;
    const conteudo = this.rascunho(id).trim();
    if (!autor || !conteudo || conteudo.length > LIMITES.comentario) return;
    this.supabase.comentar({ id_post: id, ...colunasDoAutor(autor), conteudo }).subscribe({
      next: ([novo]) => {
        if (novo) this.comentarios.update(m => new Map(m).set(id, [...(m.get(id) ?? []), novo]));
        this.setRascunho(id, '');
      },
      error: err => logError(err)
    });
  }

  iniciarEdicao(post: Post) {
    this.menuAberto.set(null);
    this.editandoId.set(post.id_post!);
    this.editTexto.set(post.descricao);
    this.editFotos.set([...post.fotos]);
  }

  salvarEdicao(post: Post) {
    const descricao = this.editTexto().trim();
    const fotos = this.editFotos().filter(Boolean);
    if (!descricao || descricao.length > LIMITES.post) return;
    this.supabase.editarPost(post, { descricao, fotos }).subscribe({
      next: () => {
        this.supabase.removerFotos(post.fotos.filter(u => !fotos.includes(u)));
        this.posts.update(l => l.map(p => p.id_post === post.id_post ? { ...p, descricao, fotos } : p));
        this.editandoId.set(null);
      },
      error: err => { logError(err); this.erro.set('Não foi possível salvar a edição.'); }
    });
  }

  excluir(post: Post) {
    this.menuAberto.set(null);
    if (!confirm('Excluir esta publicação?')) return;
    this.supabase.excluirPost(post).subscribe({
      next: () => this.posts.update(l => l.filter(p => p.id_post !== post.id_post)),
      error: err => { logError(err); this.erro.set('Não foi possível excluir a publicação.'); }
    });
  }

  aoRolarCarrossel(evento: Event, post: Post) {
    const el = evento.target as HTMLElement;
    if (el.clientWidth) this.slides.update(m => new Map(m).set(post.id_post!, Math.round(el.scrollLeft / el.clientWidth)));
  }

  slide(post: Post): number {
    return this.slides().get(post.id_post!) ?? 0;
  }

  mover(trilho: HTMLElement, direcao: 1 | -1) {
    trilho.scrollBy({ left: direcao * trilho.clientWidth, behavior: 'smooth' });
  }
}
