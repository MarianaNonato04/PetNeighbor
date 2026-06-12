import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface User {
  id_user?: number;
  nome: string;
  idade: number;
  email: string | null;
  teste: string | null;
}
@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://hrfestijxvifjgtmcxan.supabase.co/rest/v1/usuarios';
  private apiKey = 'sb_publishable_rpEaVx5nlKopfuGxkh5uxg_YO8iKyrQ';
  constructor(private http: HttpClient) {}
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    });
  }
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl, {
      headers: this.getHeaders()
    });
  }
  createUser(user: User): Observable<User[]> {
    return this.http.post<User[]>(this.apiUrl, user, {
      headers: this.getHeaders()
    });
  }
}
