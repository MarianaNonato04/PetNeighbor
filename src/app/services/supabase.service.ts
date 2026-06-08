import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Usuario, Pet } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private apiUrl = 'https://hrfestijxvifjgtmcxan.supabase.co/rest/v1';
  private apiKey = 'sb_publishable_rpEaVx5nlKopfuGxkh5uxg_YO8iKyrQ';

  // Mock logged-in user state
  currentUser = signal<Usuario | null>(null);

  constructor(private http: HttpClient) {
    // Try to restore user from session
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

  logout() {
    this.currentUser.set(null);
    localStorage.removeItem('petneighbor_user');
  }
}
