import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const supabase = inject(SupabaseService);
  if (supabase.currentUser()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

export const cuidadorGuard: CanActivateFn = (_route, state) => {
  const supabase = inject(SupabaseService);
  if (supabase.currentCuidador()) return true;
  return inject(Router).createUrlTree(['/area-cuidador/login'], { queryParams: { returnUrl: state.url } });
};
