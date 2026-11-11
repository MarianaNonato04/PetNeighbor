import { FormControl, FormGroup } from '@angular/forms';
import { colunasDoAutor, mapearPost } from '../services/supabase.service';
import { precoPorHora, proximaHoraCheia } from '../components/agendar/agendar.component';
import { gerarCalendario } from '../components/painel-cuidador/painel-cuidador.component';
import { agruparConversasDoTutor } from '../components/conversas/conversas.component';
import { tempoRelativo } from '../components/feed/feed.component';
import { senhasIguais } from '../components/esqueci-senha/redefinir-senha.component';
import { fotoPostSegura } from './foto.util';
import { emailDuplicado } from './erro.util';
import { iconeServico } from './servico.util';
import { environment } from '../../environments/environment';
import { Cuidador } from '../models/interfaces';

const ana = { preco_passeio: 35, preco_alimentacao: 0, preco_companhia: 30 } as Cuidador;

describe('agendamento com vários serviços', () => {
  it('soma o preço por hora dos serviços escolhidos', () => {
    expect(precoPorHora(ana, ['Passeio', 'Companhia'])).toBe(65);
    expect(precoPorHora(ana, [])).toBe(0);
    expect(precoPorHora(null, ['Passeio'])).toBe(0);
  });

  it('sugere a próxima hora cheia, virando o dia quando preciso', () => {
    expect(proximaHoraCheia(new Date(2026, 10, 10, 14, 25))).toEqual(['2026-11-10', '15:00']);
    expect(proximaHoraCheia(new Date(2026, 10, 10, 23, 40))).toEqual(['2026-11-11', '00:00']);
  });
});

describe('gerarCalendario', () => {
  it('monta 6 semanas começando no domingo e marca os dias com serviço', () => {
    const dias = gerarCalendario(new Date(2026, 10, 1), new Set(['2026-11-13']), '2026-11-10');
    expect(dias.length).toBe(42);
    expect(dias[0].data).toBe('2026-11-01');
    expect(dias.find(d => d.data === '2026-11-13')?.temServico).toBeTrue();
    expect(dias.find(d => d.data === '2026-11-10')?.hoje).toBeTrue();
    expect(dias[41].doMes).toBeFalse();
  });
});

describe('agruparConversasDoTutor', () => {
  it('uma conversa por cuidador, com a mensagem mais recente e as não lidas', () => {
    const base = { conversa_id: 't1-c2', id_user: 1, foto_cuidador: null, nome_cuidador: 'Ana' };
    const r = agruparConversasDoTutor([
      { ...base, id_cuidador: 2, remetente: 'cuidador', conteudo: 'oi de novo', lida: false },
      { ...base, id_cuidador: 2, remetente: 'cuidador', conteudo: 'oi', lida: false },
      { ...base, id_cuidador: 2, remetente: 'tutor', conteudo: 'olá', lida: false },
      { ...base, id_cuidador: 5, nome_cuidador: 'Bruno', remetente: 'tutor', conteudo: 'tudo bem?', lida: true }
    ]);
    expect(r.length).toBe(2);
    expect(r[0]).toEqual(jasmine.objectContaining({ id_cuidador: 2, ultima: 'oi de novo', naoLidas: 2 }));
    expect(r[1]).toEqual(jasmine.objectContaining({ nome: 'Bruno', naoLidas: 0 }));
  });
});

describe('feed', () => {
  it('mapeia autor e curtidas do join', () => {
    const tutor = mapearPost({ id_post: 1, autor_tipo: 'tutor', descricao: 'x', fotos: [], id_user: 3,
      usuarios: { nome: 'Camila' }, cuidadores: null, curtidas: [{ count: 4 }] } as never);
    expect(tutor).toEqual(jasmine.objectContaining({ autor_nome: 'Camila', autor_foto: null, qtd_curtidas: 4 }));
    const cuidador = mapearPost({ id_post: 2, autor_tipo: 'cuidador', descricao: 'y', fotos: null, id_cuidador: 1,
      usuarios: null, cuidadores: { nome: 'Ana', foto_url: 'f' } } as never);
    expect(cuidador).toEqual(jasmine.objectContaining({ autor_nome: 'Ana', autor_foto: 'f', qtd_curtidas: 0, fotos: [] }));
  });

  it('grava só o identificador do papel usado', () => {
    expect(colunasDoAutor({ autor_tipo: 'tutor', id_user: 3, id_cuidador: 9 })).toEqual({ autor_tipo: 'tutor', id_user: 3, id_cuidador: null });
    expect(colunasDoAutor({ autor_tipo: 'cuidador', id_cuidador: 1 })).toEqual({ autor_tipo: 'cuidador', id_user: null, id_cuidador: 1 });
  });

  it('formata o tempo relativo', () => {
    const agora = new Date('2026-11-10T12:00:00Z').getTime();
    expect(tempoRelativo('2026-11-10T11:59:40Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-11-10T11:15:00Z', agora)).toBe('45 min');
    expect(tempoRelativo('2026-11-10T07:00:00Z', agora)).toBe('5 h');
    expect(tempoRelativo('2026-11-07T12:00:00Z', agora)).toBe('3 d');
  });

  it('aceita fotos do Storage e as antigas em base64, recusa links externos', () => {
    const storage = environment.fotoUrlPrefix + 'posts/a.jpg';
    expect(fotoPostSegura(storage)).toBe(storage);
    expect(fotoPostSegura('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA');
    expect(fotoPostSegura('data:text/html;base64,AAAA')).toBeNull();
    expect(fotoPostSegura('https://images.unsplash.com/x.jpg')).toBeNull();
  });
});

describe('validações', () => {
  it('reconhece e-mail duplicado pelo código do Postgres ou pela mensagem', () => {
    expect(emailDuplicado({ code: '23505' })).toBeTrue();
    expect(emailDuplicado({ message: 'duplicate key value violates unique constraint' })).toBeTrue();
    expect(emailDuplicado({ code: '42501' })).toBeFalse();
    expect(emailDuplicado(null)).toBeFalse();
  });

  it('exige que a confirmação seja igual à senha', () => {
    const g = (a: string, b: string) => new FormGroup({ senha: new FormControl(a), confirmacao: new FormControl(b) });
    expect(senhasIguais(g('segredo123', 'segredo123'))).toBeNull();
    expect(senhasIguais(g('segredo123', 'outra'))).toEqual({ diferentes: true });
  });

  it('usa o ícone do primeiro serviço quando há vários', () => {
    expect(iconeServico('Passeio, Companhia')).toBe('directions_walk');
    expect(iconeServico('Alimentação')).toBe('restaurant');
    expect(iconeServico('Outro')).toBe('pets');
  });
});
