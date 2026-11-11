import { environment } from '../../environments/environment';

export function fotoSegura(url?: string | null): string | null {
  return url && url.startsWith(environment.fotoUrlPrefix) ? url : null;
}
