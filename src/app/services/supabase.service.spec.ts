import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SupabaseService, SUPABASE_CLIENT } from './supabase.service';
import { Usuario, Cuidador } from '../models/interfaces';


function fakeQuery(result: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: any = {
    calls,
    then: (resolve: (r: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject)
  };
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order']) {
    builder[m] = (...args: unknown[]) => { calls.push({ method: m, args }); return builder; };
  }
  return builder;
}

describe('SupabaseService', () => {
  let service: SupabaseService;
  let mockClient: any;
  let query: any;

  type Resultado = { data: unknown; error: unknown };

  
  function setup(result: Resultado | Resultado[] = { data: [], error: null }) {
    const fila = Array.isArray(result) ? [...result] : [result];
    query = fakeQuery(fila[0]);
    mockClient = {
      from: jasmine.createSpy('from').and.callFake(() => {
        query = fakeQuery(fila.length > 1 ? fila.shift()! : fila[0]);
        return query;
      }),
      channel: jasmine.createSpy('channel').and.callFake(() => {
        const ch: any = {};
        ch.on = jasmine.createSpy('on').and.returnValue(ch);
        ch.subscribe = jasmine.createSpy('subscribe').and.returnValue(ch);
        return ch;
      }),
      removeChannel: jasmine.createSpy('removeChannel')
    };
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: Promise.resolve(mockClient) }] });
    service = TestBed.inject(SupabaseService);
  }

  
  const flush = () => new Promise(r => setTimeout(r));

  const selectArgs = () => query.calls.filter((c: any) => c.method === 'select').map((c: any) => c.args[0]);

  afterEach(() => localStorage.clear());

  it('restaura o usuário salvo, removendo a senha, e atualiza com os dados do banco', async () => {
    localStorage.setItem('petneighbor_user', JSON.stringify({ id_user: 1, nome: 'A', idade: 20, email: 'a@a.com', senha: '123' }));
    setup({ data: [{ id_user: 1, nome: 'A atualizado', idade: 21, email: 'a@a.com' }], error: null });
    expect(localStorage.getItem('petneighbor_user')).not.toContain('senha');

    await flush();

    expect(mockClient.from).toHaveBeenCalledWith('usuarios');
    expect(service.currentUser()).toEqual({ id_user: 1, nome: 'A atualizado', idade: 21, email: 'a@a.com' });
  });

  it('encerra a sessão salva se a conta não existe mais no banco', async () => {
    localStorage.setItem('petneighbor_user', JSON.stringify({ id_user: 1, nome: 'A', idade: 20, email: 'a@a.com' }));
    setup({ data: [], error: null });
    await flush();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('petneighbor_user')).toBeNull();
  });

  it('encerra a sessão salva se o banco não responde', async () => {
    localStorage.setItem('petneighbor_cuidador', JSON.stringify({ id_cuidador: 3, nome: 'C' }));
    setup({ data: null, error: { message: 'fora do ar' } });
    await flush();
    expect(service.currentCuidador()).toBeNull();
  });

  it('não quebra quando o localStorage está corrompido', () => {
    localStorage.setItem('petneighbor_user', '{isso não é json');
    setup();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('petneighbor_user')).toBeNull();
  });

  it('login não pede a coluna senha e salva o usuário sem ela', async () => {
    const user: Usuario = { id_user: 1, nome: 'Tutor', idade: 25, email: 't@t.com' };
    setup({ data: [{ ...user, senha: 'vazou' }], error: null });

    await new Promise<void>(done => service.login('t@t.com', 'x').subscribe(() => done()));

    expect(mockClient.from).toHaveBeenCalledWith('usuarios');
    expect(selectArgs()[0]).not.toContain('senha');
    expect(service.currentUser()).toEqual(user);
  });

  it('propaga o erro retornado pelo Supabase', async () => {
    setup({ data: null, error: { message: 'falhou' } });
    const err = await new Promise<any>(done => service.getCuidadores().subscribe({ error: done }));
    expect(err.message).toBe('falhou');
  });

  it('consultas de cuidadores não pedem senha nem documento', async () => {
    setup();
    await firstValueFrom(service.getCuidadores());
    await firstValueFrom(service.getCuidador(1));
    await firstValueFrom(service.loginCuidador('c@c.com', 'x'));
    for (const cols of selectArgs()) {
      expect(cols).not.toContain('senha');
      expect(cols).not.toContain('documento');
      expect(cols).not.toBe('*');
    }
  });

  it('cadastro de cuidador nunca envia o campo verificado', async () => {
    setup();
    const c = { nome: 'C', verificado: true } as Cuidador;
    await firstValueFrom(service.registerCuidador(c));
    const insert = query.calls.find((x: any) => x.method === 'insert');
    expect(insert.args[0].verificado).toBeUndefined();
  });

  it('cancelarAgendamento só altera o status para Cancelado', async () => {
    setup();
    await firstValueFrom(service.cancelarAgendamento(5));
    const update = query.calls.find((x: any) => x.method === 'update');
    expect(update.args[0]).toEqual({ status: 'Cancelado' });
  });

  it('marca várias notificações como lidas em uma requisição', async () => {
    setup();
    await firstValueFrom(service.marcarNotificacoesLidas([1, 2, 3]));
    expect(mockClient.from).toHaveBeenCalledTimes(1);
    expect(query.calls.find((x: any) => x.method === 'in').args).toEqual(['id_notificacao', [1, 2, 3]]);
  });

  it('logout limpa o usuário', () => {
    setup();
    service.currentUser.set({ id_user: 1, nome: 'A', idade: 1, email: 'a' });
    service.logout();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('petneighbor_user')).toBeNull();
  });

  it('assina mensagens pelo Realtime e cancela a assinatura', async () => {
    setup();
    const cancelar = service.subscribeMensagens('t1-c2', () => {});
    await Promise.resolve(); await Promise.resolve();
    expect(mockClient.channel).toHaveBeenCalledWith('mensagens:t1-c2');
    const canal = mockClient.channel.calls.mostRecent().returnValue;
    cancelar();
    await Promise.resolve(); await Promise.resolve();
    expect(mockClient.removeChannel).toHaveBeenCalledWith(canal);
  });

  it('não abre o canal se a assinatura for cancelada antes do client carregar', async () => {
    setup();
    const cancelar = service.subscribeMensagens('t1-c2', () => {});
    cancelar();
    await Promise.resolve(); await Promise.resolve();
    expect(mockClient.channel).not.toHaveBeenCalled();
  });

  it('agenda do tutor traz nomes do cuidador e do pet pelo join', async () => {
    setup({ data: [{ id_agendamento: 1, cuidadores: { nome: 'Ana' }, pets: { nome_pet: 'Rex' } }], error: null });
    const [a] = await firstValueFrom(service.getAgendamentosByUser(1));
    expect(selectArgs()[0]).toBe('*, cuidadores(nome), pets(nome_pet)');
    expect(a.nome_cuidador).toBe('Ana');
    expect(a.nome_pet).toBe('Rex');
    expect((a as any).cuidadores).toBeUndefined();
  });

  it('cuidador só altera status dos próprios agendamentos', async () => {
    setup();
    await firstValueFrom(service.atualizarStatusComoCuidador(7, 3, 'Confirmado'));
    const eqs = query.calls.filter((x: any) => x.method === 'eq').map((x: any) => x.args);
    expect(eqs).toContain(['id_agendamento', 7]);
    expect(eqs).toContain(['id_cuidador', 3]);
  });

  it('login de cuidador salva a sessão sem senha e documento', async () => {
    setup({ data: [{ id_cuidador: 3, nome: 'Ana', senha: 'x', documento: '123' }], error: null });
    await firstValueFrom(service.loginCuidador('a@a.com', 'x'));
    expect(service.currentCuidador()).toEqual({ id_cuidador: 3, nome: 'Ana' } as any);
    expect(localStorage.getItem('petneighbor_cuidador')).not.toContain('documento');
    service.logoutCuidador();
    expect(service.currentCuidador()).toBeNull();
  });

  it('excluir conta apaga o tutor e encerra a sessão', async () => {
    localStorage.setItem('petneighbor_user', JSON.stringify({ id_user: 7, nome: 'A', idade: 20, email: 'a@a.com' }));
    setup({ data: [{ id_user: 7, nome: 'A', idade: 20, email: 'a@a.com' }], error: null });
    await flush();

    await firstValueFrom(service.excluirConta(7));

    expect(mockClient.from).toHaveBeenCalledWith('usuarios');
    expect(query.calls.map((c: any) => c.method)).toContain('delete');
    expect(query.calls).toContain(jasmine.objectContaining({ method: 'eq', args: ['id_user', 7] }));
    expect(service.currentUser()).toBeNull();
  });

  it('excluir conta falha e mantém a sessão se nada foi apagado', async () => {
    localStorage.setItem('petneighbor_user', JSON.stringify({ id_user: 7, nome: 'A', idade: 20, email: 'a@a.com' }));
    setup([{ data: [{ id_user: 7, nome: 'A', idade: 20, email: 'a@a.com' }], error: null }, { data: [], error: null }]);
    await flush();

    const err = await new Promise<any>(done => service.excluirConta(7).subscribe({ error: done }));

    expect(err).toBeTruthy();
    expect(service.currentUser()?.id_user).toBe(7);
  });

  it('marca como lidas só as mensagens do outro lado ainda não lidas', async () => {
    setup();
    await firstValueFrom(service.marcarMensagensLidas('t1-c2', 'tutor'));
    const eqs = query.calls.filter((c: any) => c.method === 'eq').map((c: any) => c.args);
    expect(eqs).toEqual([['conversa_id', 't1-c2'], ['remetente', 'tutor'], ['lida', false]]);
  });

  it('notificações do cuidador filtram por id_cuidador', async () => {
    setup();
    await firstValueFrom(service.getNotificacoesCuidador(3));
    expect(query.calls).toContain(jasmine.objectContaining({ method: 'eq', args: ['id_cuidador', 3] }));
  });
});
