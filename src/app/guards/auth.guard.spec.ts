import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { SupabaseService } from '../services/supabase.service';

describe('authGuard', () => {
  const currentUser = signal<any>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SupabaseService, useValue: { currentUser } }]
    });
  });

  const run = (url: string) => TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot));

  it('libera a rota quando há usuário logado', () => {
    currentUser.set({ id_user: 1 });
    expect(run('/chat/1')).toBeTrue();
  });

  it('redireciona para /login com returnUrl quando não há usuário', () => {
    currentUser.set(null);
    const result = run('/chat/1') as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fchat%2F1');
  });
});
