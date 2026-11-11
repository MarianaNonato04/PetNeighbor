import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { Observable, from, map, tap } from 'rxjs';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Usuario, Pet, Cuidador, Agendamento, Mensagem, Notificacao, StatusAgendamento
} from '../models/interfaces';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'petneighbor_user';
const STORAGE_KEY_CUIDADOR = 'petneighbor_cuidador';


export const SUPABASE_CLIENT = new InjectionToken<Promise<SupabaseClient>>('SUPABASE_CLIENT', {
  providedIn: 'root',
  factory: () => import('@supabase/supabase-js').then(m =>
    m.createClient(environment.supabaseUrl, environment.supabaseKey))
});


export type Cancelar = () => void;


type AgendamentoComJoin = Agendamento & {
  cuidadores?: { nome: string } | null;
  usuarios?: { nome: string } | null;
  pets?: { nome_pet: string } | null;
};

type MensagemComJoin = Mensagem & { usuarios?: { nome: string } | null };

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client = inject(SUPABASE_CLIENT);

  
  
  
  private readonly USUARIO_COLS = 'id_user, nome, idade, email';
  private readonly CUIDADOR_COLS =
    'id_cuidador, nome, email, bio, cidade, latitude, longitude, servicos, ' +
    'preco_passeio, preco_alimentacao, preco_companhia, verificado, foto_url, created_at';

  
  currentUser = signal<Usuario | null>(null);
  
  currentCuidador = signal<Cuidador | null>(null);

  constructor() {
    const user = this.restaurar<Usuario>(STORAGE_KEY, u => typeof u.id_user === 'number');
    if (user) {
      this.setCurrentUser(user);
      
      this.confirmarSessao(c => c.from('usuarios').select(this.USUARIO_COLS).eq('id_user', user.id_user!),
        (u: Usuario) => this.setCurrentUser(u), () => this.logout());
    }
    const cuidador = this.restaurar<Cuidador>(STORAGE_KEY_CUIDADOR, c => typeof c.id_cuidador === 'number');
    if (cuidador) {
      this.setCurrentCuidador(cuidador);
      this.confirmarSessao(c => c.from('cuidadores').select(this.CUIDADOR_COLS).eq('id_cuidador', cuidador.id_cuidador!),
        (cd: Cuidador) => this.setCurrentCuidador(cd), () => this.logoutCuidador());
    }
  }

  
  private confirmarSessao<T>(
    build: (c: SupabaseClient) => PromiseLike<{ data: unknown; error: unknown }>,
    atualizar: (row: T) => void,
    encerrar: () => void
  ) {
    this.run<T>(build).subscribe({
      next: rows => rows.length > 0 ? atualizar(rows[0]) : encerrar(),
      error: () => encerrar()
    });
  }

  

  private restaurar<T>(key: string, valido: (v: T) => boolean): T | null {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return null;
      const valor = JSON.parse(saved) as T;
      if (valor && valido(valor)) return valor;
      localStorage.removeItem(key);
    } catch {
      
      try { localStorage.removeItem(key); } catch {  }
    }
    return null;
  }

  private salvar(key: string, valor: unknown | null) {
    try {
      if (valor === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(valor));
    } catch {  }
  }

  private setCurrentUser(user: Usuario) {
    const { senha, ...safeUser } = user;
    this.currentUser.set(safeUser);
    this.salvar(STORAGE_KEY, safeUser);
  }

  private setCurrentCuidador(cuidador: Cuidador) {
    const { senha, documento, ...safe } = cuidador;
    this.currentCuidador.set(safe);
    this.salvar(STORAGE_KEY_CUIDADOR, safe);
  }

  logout() {
    this.currentUser.set(null);
    this.salvar(STORAGE_KEY, null);
  }

  logoutCuidador() {
    this.currentCuidador.set(null);
    this.salvar(STORAGE_KEY_CUIDADOR, null);
  }

  
  excluirConta(idUser: number): Observable<void> {
    return this.excluir(c => c.from('usuarios').delete().eq('id_user', idUser).select('id_user')).pipe(
      tap(() => this.logout())
    );
  }

  
  excluirContaCuidador(idCuidador: number): Observable<void> {
    return this.excluir(c => c.from('cuidadores').delete().eq('id_cuidador', idCuidador).select('id_cuidador')).pipe(
      tap(() => this.logoutCuidador())
    );
  }

  
  private excluir(build: (c: SupabaseClient) => PromiseLike<{ data: unknown; error: unknown }>): Observable<void> {
    return this.run(build).pipe(map(rows => {
      if (rows.length === 0) throw new Error('Nenhuma conta foi excluída.');
    }));
  }

  

  
  private run<T>(build: (c: SupabaseClient) => PromiseLike<{ data: unknown; error: unknown }>): Observable<T[]> {
    return from(this.client.then(c => build(c))).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []) as T[];
      })
    );
  }

  private assinar<T>(canal: string, tabela: string, filtro: string, onInsert: (row: T) => void): Cancelar {
    let channel: RealtimeChannel | undefined;
    let cancelado = false;
    this.client.then(c => {
      if (cancelado) return;
      channel = c.channel(canal)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: tabela, filter: filtro },
          payload => onInsert(payload.new as T))
        .subscribe();
    });
    return () => {
      cancelado = true;
      if (channel) {
        const ch = channel;
        this.client.then(c => c.removeChannel(ch));
      }
    };
  }

  

  registerUsuario(user: Usuario): Observable<Usuario[]> {
    return this.run<Usuario>(c => c.from('usuarios').insert(user).select(this.USUARIO_COLS)).pipe(
      tap(users => { if (users.length > 0) this.setCurrentUser(users[0]); })
    );
  }

  login(email: string, senha: string): Observable<Usuario[]> {
    return this.run<Usuario>(c =>
      c.from('usuarios').select(this.USUARIO_COLS).eq('email', email).eq('senha', senha)
    ).pipe(
      tap(users => { if (users.length > 0) this.setCurrentUser(users[0]); })
    );
  }

  getUsuarioNome(id: number): Observable<Pick<Usuario, 'id_user' | 'nome'>[]> {
    return this.run(c => c.from('usuarios').select('id_user, nome').eq('id_user', id));
  }

  registerPet(pet: Pet): Observable<Pet[]> {
    return this.run<Pet>(c => c.from('pets').insert(pet).select());
  }

  getPetsByUser(userId: number): Observable<Pet[]> {
    return this.run<Pet>(c => c.from('pets').select('*').eq('id_user', userId));
  }

  

  registerCuidador(cuidador: Cuidador): Observable<Cuidador[]> {
    
    const { verificado, ...dados } = cuidador;
    return this.run<Cuidador>(c => c.from('cuidadores').insert(dados).select(this.CUIDADOR_COLS)).pipe(
      tap(rows => { if (rows.length > 0) this.setCurrentCuidador(rows[0]); })
    );
  }

  loginCuidador(email: string, senha: string): Observable<Cuidador[]> {
    return this.run<Cuidador>(c =>
      c.from('cuidadores').select(this.CUIDADOR_COLS).eq('email', email).eq('senha', senha)
    ).pipe(
      tap(rows => { if (rows.length > 0) this.setCurrentCuidador(rows[0]); })
    );
  }

  getCuidadores(): Observable<Cuidador[]> {
    return this.run<Cuidador>(c =>
      c.from('cuidadores').select(this.CUIDADOR_COLS).order('created_at', { ascending: false })
    );
  }

  getCuidador(id: number): Observable<Cuidador[]> {
    return this.run<Cuidador>(c => c.from('cuidadores').select(this.CUIDADOR_COLS).eq('id_cuidador', id));
  }

  

  createAgendamento(ag: Agendamento): Observable<Agendamento[]> {
    return this.run<Agendamento>(c => c.from('agendamentos').insert(ag).select());
  }

  
  getAgendamentosByUser(userId: number): Observable<Agendamento[]> {
    return this.run<AgendamentoComJoin>(c =>
      c.from('agendamentos').select('*, cuidadores(nome), pets(nome_pet)').eq('id_user', userId)
        .order('data', { ascending: true }).order('hora', { ascending: true })
    ).pipe(map(rows => rows.map(({ cuidadores, pets, usuarios, ...a }) => ({
      ...a,
      nome_cuidador: cuidadores?.nome ?? 'Cuidador',
      nome_pet: pets?.nome_pet ?? 'Pet'
    }))));
  }

  
  getAgendamentosByCuidador(idCuidador: number): Observable<Agendamento[]> {
    return this.run<AgendamentoComJoin>(c =>
      c.from('agendamentos').select('*, usuarios(nome), pets(nome_pet)').eq('id_cuidador', idCuidador)
        .order('data', { ascending: true }).order('hora', { ascending: true })
    ).pipe(map(rows => rows.map(({ cuidadores, pets, usuarios, ...a }) => ({
      ...a,
      nome_tutor: usuarios?.nome ?? 'Tutor',
      nome_pet: pets?.nome_pet ?? 'Pet'
    }))));
  }

  
  cancelarAgendamento(id: number): Observable<Agendamento[]> {
    return this.run<Agendamento>(c =>
      c.from('agendamentos').update({ status: 'Cancelado' }).eq('id_agendamento', id).select()
    );
  }

  
  atualizarStatusComoCuidador(id: number, idCuidador: number, status: StatusAgendamento): Observable<Agendamento[]> {
    return this.run<Agendamento>(c =>
      c.from('agendamentos').update({ status }).eq('id_agendamento', id).eq('id_cuidador', idCuidador).select()
    );
  }

  

  buildConversaId(idUser: number, idCuidador: number): string {
    return `t${idUser}-c${idCuidador}`;
  }

  getMensagens(conversaId: string): Observable<Mensagem[]> {
    return this.run<Mensagem>(c =>
      c.from('mensagens').select('*').eq('conversa_id', conversaId).order('created_at', { ascending: true })
    );
  }

  sendMensagem(msg: Mensagem): Observable<Mensagem[]> {
    return this.run<Mensagem>(c => c.from('mensagens').insert(msg).select());
  }

  
  getMensagensDoCuidador(idCuidador: number): Observable<(Mensagem & { nome_tutor: string })[]> {
    return this.run<MensagemComJoin>(c =>
      c.from('mensagens').select('*, usuarios(nome)').eq('id_cuidador', idCuidador)
        .order('created_at', { ascending: false })
    ).pipe(map(rows => rows.map(({ usuarios, ...m }) => ({ ...m, nome_tutor: usuarios?.nome ?? 'Tutor' }))));
  }

  
  marcarMensagensLidas(conversaId: string, remetente: Mensagem['remetente']): Observable<Mensagem[]> {
    return this.run<Mensagem>(c =>
      c.from('mensagens').update({ lida: true })
        .eq('conversa_id', conversaId).eq('remetente', remetente).eq('lida', false).select('id_mensagem')
    );
  }

  subscribeMensagens(conversaId: string, onInsert: (msg: Mensagem) => void): Cancelar {
    return this.assinar(`mensagens:${conversaId}`, 'mensagens', `conversa_id=eq.${conversaId}`, onInsert);
  }

  

  getNotificacoes(userId: number): Observable<Notificacao[]> {
    return this.run<Notificacao>(c =>
      c.from('notificacoes').select('*').eq('id_user', userId).order('created_at', { ascending: false })
    );
  }

  createNotificacao(n: Notificacao): Observable<Notificacao[]> {
    return this.run<Notificacao>(c => c.from('notificacoes').insert(n).select());
  }

  marcarNotificacaoLida(id: number): Observable<Notificacao[]> {
    return this.marcarNotificacoesLidas([id]);
  }

  
  marcarNotificacoesLidas(ids: number[]): Observable<Notificacao[]> {
    return this.run<Notificacao>(c =>
      c.from('notificacoes').update({ lida: true }).in('id_notificacao', ids).select()
    );
  }

  subscribeNotificacoes(userId: number, onInsert: (n: Notificacao) => void): Cancelar {
    return this.assinar(`notificacoes:${userId}`, 'notificacoes', `id_user=eq.${userId}`, onInsert);
  }

  
  getNotificacoesCuidador(idCuidador: number): Observable<Notificacao[]> {
    return this.run<Notificacao>(c =>
      c.from('notificacoes').select('*').eq('id_cuidador', idCuidador).eq('lida', false)
        .order('created_at', { ascending: false })
    );
  }

  subscribeNotificacoesCuidador(idCuidador: number, onInsert: (n: Notificacao) => void): Cancelar {
    return this.assinar(`notificacoes-cuidador:${idCuidador}`, 'notificacoes', `id_cuidador=eq.${idCuidador}`, onInsert);
  }
}
