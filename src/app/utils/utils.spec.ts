import { hojeLocal, horaAtual } from './date.util';
import { fotoSegura } from './foto.util';
import { environment } from '../../environments/environment';
import { arredondarCoord } from '../services/geo.util';

describe('hojeLocal', () => {
  it('usa a data local, não UTC (ex.: 22h no Brasil continua sendo "hoje")', () => {
    const noite = new Date(2026, 10, 10, 22, 30);
    expect(hojeLocal(noite)).toBe('2026-11-10');
  });

  it('preenche mês e dia com zero à esquerda', () => {
    expect(hojeLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('fotoSegura', () => {
  it('aceita fotos do Storage do projeto', () => {
    const url = environment.fotoUrlPrefix + 'fotos/a.png';
    expect(fotoSegura(url)).toBe(url);
  });

  it('rejeita URLs externas e vazias', () => {
    expect(fotoSegura('https://exemplo.com/rastreio.gif')).toBeNull();
    expect(fotoSegura('javascript:alert(1)')).toBeNull();
    expect(fotoSegura(undefined)).toBeNull();
    expect(fotoSegura('')).toBeNull();
  });
});

describe('arredondarCoord', () => {
  it('arredonda para 3 casas decimais', () => {
    expect(arredondarCoord(-23.589512)).toBe(-23.59);
    expect(arredondarCoord(-46.634049)).toBe(-46.634);
  });
});

describe('horaAtual', () => {
  it('formata a hora local com dois dígitos', () => {
    expect(horaAtual(new Date(2026, 10, 10, 9, 5))).toBe('09:05');
  });
});
