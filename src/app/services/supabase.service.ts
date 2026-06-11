import { Injectable, signal } from '@angular/core';
import { Observable, from, map, tap } from 'rxjs';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Usuario, Pet, Cuidador, Agendamento, Mensagem, Notificacao, StatusAgendamento
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabaseUrl = 'https://hrfestijxvifjgtmcxan.supabase.co';
  private apiUrl = `${this.supabaseUrl}/rest/v1`;
  private apiKey = 'sb_publishable_rpEaVx5nlKopfuGxkh5uxg_YO8iKyrQ';

  private client: SupabaseClient = createClient(this.supabaseUrl, this.apiKey);

  currentUser = signal<Usuario | null>(null);

  constructor() {
    const savedUser = localStorage.getItem('petneighbor_user');
    if (savedUser) {
      this.currentUser.set(JSON.parse(savedUser));
    }
  }

  private handleResponse<T>(p: any): Observable<T[]> {
    // supabase-js query builders are thenable but not typed as Promise — cast safely
    return from(p as Promise<any>).pipe(
      map(r => {
        if (r.error) throw r.error;
        return (r.data ?? []) as T[];
      })
    );
  }

  private toPromise(q: any): Promise<any> {
    // supabase-js query builders are thenable; ensure we return a real Promise
    return (q as any).then ? (q as any).then((r: any) => r) : Promise.resolve(q);
  }

  registerUsuario(user: Usuario): Observable<Usuario[]> {
    const p = this.client.from('usuarios').insert(user).select();
    return this.handleResponse<Usuario>(this.toPromise(p)).pipe(
      tap(users => { if (users && users.length > 0) this.setCurrentUser(users[0]); })
    );
  }

  updateUsuario(userId: number, updates: Partial<Usuario>): Observable<Usuario[]> {
    const p = this.client.from('usuarios').update(updates).eq('id_user', userId).select();
    return this.handleResponse<Usuario>(this.toPromise(p)).pipe(
      tap(users => { if (users && users.length > 0) this.setCurrentUser(users[0]); })
    );
  }

  login(email: string, senha: string): Observable<Usuario[]> {
    const p = this.client.from('usuarios').select('*').eq('email', email).eq('senha', senha);
    return this.handleResponse<Usuario>(this.toPromise(p)).pipe(
      tap(users => { if (users && users.length > 0) this.setCurrentUser(users[0]); })
    );
  }

  private setCurrentUser(user: Usuario) {
    this.currentUser.set(user);
    localStorage.setItem('petneighbor_user', JSON.stringify(user));
  }

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('petneighbor_user');
  }

  registerPet(pet: Pet): Observable<Pet[]> {
    const p = this.client.from('pets').insert(pet).select();
    return this.handleResponse<Pet>(this.toPromise(p));
  }

  getPetsByUser(userId: number): Observable<Pet[]> {
    const p = this.client.from('pets').select('*').eq('id_user', userId);
    return this.handleResponse<Pet>(this.toPromise(p));
  }

  registerCuidador(cuidador: Cuidador): Observable<Cuidador[]> {
    const p = this.client.from('cuidadores').insert(cuidador).select();
    return this.handleResponse<Cuidador>(this.toPromise(p));
  }

  getCuidadores(): Observable<Cuidador[]> {
    const p = this.client.from('cuidadores').select('*').order('created_at', { ascending: false });
    return this.handleResponse<Cuidador>(this.toPromise(p));
  }

  getCuidador(id: number): Observable<Cuidador[]> {
    const p = this.client.from('cuidadores').select('*').eq('id_cuidador', id);
    return this.handleResponse<Cuidador>(this.toPromise(p));
  }

  createAgendamento(ag: Agendamento): Observable<Agendamento[]> {
    const p = this.client.from('agendamentos').insert(ag).select();
    return this.handleResponse<Agendamento>(this.toPromise(p));
  }

  getAgendamentosByUser(userId: number): Observable<Agendamento[]> {
    const p = this.client.from('agendamentos').select('*').eq('id_user', userId).order('data', { ascending: true }).order('hora', { ascending: true });
    return this.handleResponse<Agendamento>(this.toPromise(p));
  }

  updateAgendamentoStatus(id: number, status: StatusAgendamento): Observable<Agendamento[]> {
    const p = this.client.from('agendamentos').update({ status }).eq('id_agendamento', id).select();
    return this.handleResponse<Agendamento>(this.toPromise(p));
  }

  buildConversaId(idUser: number, idCuidador: number): string {
    return `t${idUser}-c${idCuidador}`;
  }

  getMensagens(conversaId: string): Observable<Mensagem[]> {
    const p = this.client.from('mensagens').select('*').eq('conversa_id', conversaId).order('created_at', { ascending: true });
    return this.handleResponse<Mensagem>(this.toPromise(p));
  }

  sendMensagem(msg: Mensagem): Observable<Mensagem[]> {
    const p = this.client.from('mensagens').insert(msg).select();
    return this.handleResponse<Mensagem>(this.toPromise(p));
  }

  getConversasByUser(userId: number): Observable<Mensagem[]> {
    const p = this.client.from('mensagens').select('*').eq('id_user', userId).order('created_at', { ascending: false });
    return this.handleResponse<Mensagem>(this.toPromise(p));
  }

  subscribeMensagens(conversaId: string, onInsert: (msg: Mensagem) => void): any {
    return this.client
      .channel(`mensagens:${conversaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `conversa_id=eq.${conversaId}` },
        payload => onInsert(payload.new as Mensagem)
      )
      .subscribe();
  }

  getNotificacoes(userId: number): Observable<Notificacao[]> {
    const p = this.client.from('notificacoes').select('*').eq('id_user', userId).order('created_at', { ascending: false });
    return this.handleResponse<Notificacao>(this.toPromise(p));
  }

  createNotificacao(n: Notificacao): Observable<Notificacao[]> {
    const p = this.client.from('notificacoes').insert(n).select();
    return this.handleResponse<Notificacao>(this.toPromise(p));
  }

  marcarNotificacaoLida(id: number): Observable<Notificacao[]> {
    const p = this.client.from('notificacoes').update({ lida: true }).eq('id_notificacao', id).select();
    return this.handleResponse<Notificacao>(this.toPromise(p));
  }

  subscribeNotificacoes(userId: number, onInsert: (n: Notificacao) => void): any {
    return this.client
      .channel(`notificacoes:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `id_user=eq.${userId}` },
        payload => onInsert(payload.new as Notificacao)
      )
      .subscribe();
  }

  removeChannel(channel: any) {
    // supabase-js v2 exposes `removeChannel` or `unsubscribe`; try both safely
    if (this.client.removeChannel) {
      // @ts-ignore
      this.client.removeChannel(channel);
    } else if (channel.unsubscribe) {
      channel.unsubscribe();
    }
  }
}
