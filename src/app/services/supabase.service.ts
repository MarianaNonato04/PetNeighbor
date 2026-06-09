import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
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

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('petneighbor_user');
    if (savedUser) {
      this.currentUser.set(JSON.parse(savedUser));
    }
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    });
  }

  registerUsuario(user: Usuario): Observable<Usuario[]> {
    return this.http.post<Usuario[]>(`${this.apiUrl}/usuarios`, user, {
      headers: this.getHeaders()
    }).pipe(
      tap(users => {
        if (users && users.length > 0) {
          this.setCurrentUser(users[0]);
        }
      })
    );
  }

  login(email: string, senha: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.apiUrl}/usuarios?email=eq.${email}&senha=eq.${senha}`, {
      headers: this.getHeaders()
    }).pipe(
      tap(users => {
        if (users && users.length > 0) {
          this.setCurrentUser(users[0]);
        }
      })
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
    return this.http.post<Pet[]>(`${this.apiUrl}/pets`, pet, {
      headers: this.getHeaders()
    });
  }

  getPetsByUser(userId: number): Observable<Pet[]> {
    return this.http.get<Pet[]>(`${this.apiUrl}/pets?id_user=eq.${userId}`, {
      headers: this.getHeaders()
    });
  }

  registerCuidador(cuidador: Cuidador): Observable<Cuidador[]> {
    return this.http.post<Cuidador[]>(`${this.apiUrl}/cuidadores`, cuidador, {
      headers: this.getHeaders()
    });
  }

  getCuidadores(): Observable<Cuidador[]> {
    return this.http.get<Cuidador[]>(`${this.apiUrl}/cuidadores?order=created_at.desc`, {
      headers: this.getHeaders()
    });
  }

  getCuidador(id: number): Observable<Cuidador[]> {
    return this.http.get<Cuidador[]>(`${this.apiUrl}/cuidadores?id_cuidador=eq.${id}`, {
      headers: this.getHeaders()
    });
  }

  createAgendamento(ag: Agendamento): Observable<Agendamento[]> {
    return this.http.post<Agendamento[]>(`${this.apiUrl}/agendamentos`, ag, {
      headers: this.getHeaders()
    });
  }

  getAgendamentosByUser(userId: number): Observable<Agendamento[]> {
    return this.http.get<Agendamento[]>(
      `${this.apiUrl}/agendamentos?id_user=eq.${userId}&order=data.asc,hora.asc`,
      { headers: this.getHeaders() }
    );
  }

  updateAgendamentoStatus(id: number, status: StatusAgendamento): Observable<Agendamento[]> {
    return this.http.patch<Agendamento[]>(
      `${this.apiUrl}/agendamentos?id_agendamento=eq.${id}`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  buildConversaId(idUser: number, idCuidador: number): string {
    return `t${idUser}-c${idCuidador}`;
  }

  getMensagens(conversaId: string): Observable<Mensagem[]> {
    return this.http.get<Mensagem[]>(
      `${this.apiUrl}/mensagens?conversa_id=eq.${conversaId}&order=created_at.asc`,
      { headers: this.getHeaders() }
    );
  }

  sendMensagem(msg: Mensagem): Observable<Mensagem[]> {
    return this.http.post<Mensagem[]>(`${this.apiUrl}/mensagens`, msg, {
      headers: this.getHeaders()
    });
  }

  getConversasByUser(userId: number): Observable<Mensagem[]> {
    return this.http.get<Mensagem[]>(
      `${this.apiUrl}/mensagens?id_user=eq.${userId}&order=created_at.desc`,
      { headers: this.getHeaders() }
    );
  }

  subscribeMensagens(conversaId: string, onInsert: (msg: Mensagem) => void): RealtimeChannel {
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
    return this.http.get<Notificacao[]>(
      `${this.apiUrl}/notificacoes?id_user=eq.${userId}&order=created_at.desc`,
      { headers: this.getHeaders() }
    );
  }

  createNotificacao(n: Notificacao): Observable<Notificacao[]> {
    return this.http.post<Notificacao[]>(`${this.apiUrl}/notificacoes`, n, {
      headers: this.getHeaders()
    });
  }

  marcarNotificacaoLida(id: number): Observable<Notificacao[]> {
    return this.http.patch<Notificacao[]>(
      `${this.apiUrl}/notificacoes?id_notificacao=eq.${id}`,
      { lida: true },
      { headers: this.getHeaders() }
    );
  }

  subscribeNotificacoes(userId: number, onInsert: (n: Notificacao) => void): RealtimeChannel {
    return this.client
      .channel(`notificacoes:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `id_user=eq.${userId}` },
        payload => onInsert(payload.new as Notificacao)
      )
      .subscribe();
  }

  removeChannel(channel: RealtimeChannel) {
    this.client.removeChannel(channel);
  }
}
