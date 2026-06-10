import { TestBed } from '@angular/core/testing';
import { NotificacaoStore } from './notificacao.store';
import { SupabaseService } from './supabase.service';
import { of } from 'rxjs';
import { Notificacao } from '../models/interfaces';

describe('NotificacaoStore', () => {
  let store: NotificacaoStore;
  let supabaseSpy: jasmine.SpyObj<SupabaseService>;
  let realtimeCallback: ((n: Notificacao) => void) | null = null;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('SupabaseService', [
      'getNotificacoes',
      'subscribeNotificacoes',
      'marcarNotificacaoLida',
      'removeChannel'
    ]);

    TestBed.configureTestingModule({
      providers: [
        NotificacaoStore,
        { provide: SupabaseService, useValue: spy }
      ]
    });

    store = TestBed.inject(NotificacaoStore);
    supabaseSpy = TestBed.inject(SupabaseService) as jasmine.SpyObj<SupabaseService>;

    realtimeCallback = null;
    supabaseSpy.subscribeNotificacoes.and.callFake((userId: number, callback: (n: Notificacao) => void) => {
      realtimeCallback = callback;
      return { id: 'mock-channel' } as any;
    });
  });

  it('should be created with initial state', () => {
    expect(store).toBeTruthy();
    expect(store.notificacoes()).toEqual([]);
    expect(store.naoLidas()).toBe(0);
  });

  it('should fetch notifications and set state when starting', () => {
    const mockNotifs: Notificacao[] = [
      { id_notificacao: 1, id_user: 10, titulo: 'Notif 1', mensagem: 'Hello', lida: false, created_at: '' },
      { id_notificacao: 2, id_user: 10, titulo: 'Notif 2', mensagem: 'World', lida: true, created_at: '' }
    ];
    supabaseSpy.getNotificacoes.and.returnValue(of(mockNotifs));

    store.iniciar(10);

    expect(supabaseSpy.getNotificacoes).toHaveBeenCalledWith(10);
    expect(supabaseSpy.subscribeNotificacoes).toHaveBeenCalledWith(10, jasmine.any(Function));
    expect(store.notificacoes()).toEqual(mockNotifs);
    expect(store.naoLidas()).toBe(1);
  });

  it('should handle real-time insert of new notifications', () => {
    supabaseSpy.getNotificacoes.and.returnValue(of([]));
    store.iniciar(10);

    expect(store.notificacoes()).toEqual([]);
    expect(realtimeCallback).not.toBeNull();

    const newNotif: Notificacao = { id_notificacao: 3, id_user: 10, titulo: 'Realtime', mensagem: 'Test', lida: false, created_at: '' };
    realtimeCallback!(newNotif);

    expect(store.notificacoes()).toEqual([newNotif]);
    expect(store.naoLidas()).toBe(1);
  });

  it('should mark notification as read', () => {
    const mockNotif: Notificacao = { id_notificacao: 1, id_user: 10, titulo: 'Test', mensagem: 'Hello', lida: false };
    store.notificacoes.set([mockNotif]);
    supabaseSpy.marcarNotificacaoLida.and.returnValue(of([{ id_notificacao: 1, lida: true } as any]));

    store.marcarLida(mockNotif);

    expect(supabaseSpy.marcarNotificacaoLida).toHaveBeenCalledWith(1);
    expect(store.notificacoes()[0].lida).toBeTrue();
    expect(store.naoLidas()).toBe(0);
  });

  it('should mark all notifications as read', () => {
    const mockNotifs: Notificacao[] = [
      { id_notificacao: 1, id_user: 10, titulo: '1', mensagem: '', lida: false },
      { id_notificacao: 2, id_user: 10, titulo: '2', mensagem: '', lida: false }
    ];
    store.notificacoes.set(mockNotifs);
    supabaseSpy.marcarNotificacaoLida.and.returnValue(of([]));

    store.marcarTodasLidas();

    expect(supabaseSpy.marcarNotificacaoLida).toHaveBeenCalledTimes(2);
  });

  it('should stop store and clean up', () => {
    supabaseSpy.getNotificacoes.and.returnValue(of([]));
    store.iniciar(10);
    expect((store as any).canal).toBeDefined();

    store.parar();

    expect(supabaseSpy.removeChannel).toHaveBeenCalled();
    expect((store as any).canal).toBeUndefined();
    expect(store.notificacoes()).toEqual([]);
  });
});
