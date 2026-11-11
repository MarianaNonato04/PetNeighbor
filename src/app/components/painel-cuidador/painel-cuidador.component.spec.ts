import { TestBed, ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PainelCuidadorComponent, agruparConversas } from './painel-cuidador.component';
import { SupabaseService } from '../../services/supabase.service';
import { Agendamento } from '../../models/interfaces';

const ag = (id: number, status: Agendamento['status']): Agendamento => ({
  id_agendamento: id, id_user: 10, id_cuidador: 3, id_pet: 1, tipo_servico: 'Passeio',
  data: '2026-12-01', hora: '09:00', recorrencia: 'Único', preco: 30, status,
  nome_tutor: 'Bia', nome_pet: 'Rex'
});

describe('PainelCuidadorComponent', () => {
  let fixture: ComponentFixture<PainelCuidadorComponent>;
  let component: PainelCuidadorComponent;
  let supabase: any;
  let novaNotificacao: (n: any) => void;

  beforeEach(async () => {
    supabase = {
      currentCuidador: signal<any>({ id_cuidador: 3, nome: 'Ana Souza', verificado: true }),
      getAgendamentosByCuidador: jasmine.createSpy().and.returnValue(of([
        ag(1, 'Pendente'), ag(2, 'Confirmado'), ag(3, 'Em andamento'), ag(4, 'Concluído')
      ])),
      getMensagensDoCuidador: jasmine.createSpy().and.returnValue(of([])),
      atualizarStatusComoCuidador: jasmine.createSpy().and.returnValue(of([])),
      createNotificacao: jasmine.createSpy().and.returnValue(of([])),
      getNotificacoesCuidador: jasmine.createSpy().and.returnValue(of([])),
      subscribeNotificacoesCuidador: jasmine.createSpy().and.callFake((_id: number, cb: any) => { novaNotificacao = cb; return () => {}; }),
      logoutCuidador: jasmine.createSpy()
    };

    await TestBed.configureTestingModule({
      imports: [PainelCuidadorComponent],
      providers: [provideRouter([]), { provide: SupabaseService, useValue: supabase }]
    }).compileComponents();

    fixture = TestBed.createComponent(PainelCuidadorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('carrega os agendamentos do cuidador logado e separa por aba', () => {
    expect(supabase.getAgendamentosByCuidador).toHaveBeenCalledWith(3);
    expect(component.pendentes()).toBe(1);
    expect(component.agendamentosDaAba().map(a => a.id_agendamento)).toEqual([1]);
    component.aba.set('Ativos');
    expect(component.agendamentosDaAba().map(a => a.id_agendamento)).toEqual([2, 3]);
    component.aba.set('Histórico');
    expect(component.agendamentosDaAba().map(a => a.id_agendamento)).toEqual([4]);
  });

  it('oferece as ações certas para cada status', () => {
    const rotulos = (s: Agendamento['status']) => component.acoes(ag(9, s)).map(a => a.rotulo);
    expect(rotulos('Pendente')).toEqual(['Recusar', 'Confirmar']);
    expect(rotulos('Confirmado')).toEqual(['Cancelar', 'Iniciar']);
    expect(rotulos('Em andamento')).toEqual(['Concluir']);
    expect(rotulos('Concluído')).toEqual([]);
    expect(rotulos('Cancelado')).toEqual([]);
  });

  it('confirmar atualiza o status e notifica o tutor', () => {
    const pendente = component.agendamentos()[0];
    const confirmar = component.acoes(pendente).find(a => a.rotulo === 'Confirmar')!;

    component.executar(pendente, confirmar);

    expect(supabase.atualizarStatusComoCuidador).toHaveBeenCalledWith(1, 3, 'Confirmado', undefined);
    expect(component.agendamentos()[0].status).toBe('Confirmado');
    const notif = supabase.createNotificacao.calls.mostRecent().args[0];
    expect(notif.id_user).toBe(10);
    expect(notif.mensagem).toContain('Ana Souza confirmou');
  });

  it('notificação nova aparece nos avisos e recarrega as listas', () => {
    supabase.getAgendamentosByCuidador.calls.reset();
    novaNotificacao({ id_notificacao: 5, id_cuidador: 3, tipo: 'agendamento', titulo: 'Novo pedido', mensagem: 'x', lida: false });
    expect(component.avisos().map(n => n.id_notificacao)).toEqual([5]);
    expect(supabase.getAgendamentosByCuidador).toHaveBeenCalledWith(3);
  });

  it('sair encerra a sessão do cuidador', () => {
    const nav = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    component.sair();
    expect(supabase.logoutCuidador).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/area-cuidador/login']);
  });
});

describe('agruparConversas', () => {
  it('gera uma conversa por tutor, com a mensagem mais recente', () => {
    const msgs = [
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'oi de novo', created_at: '2026-11-10T12:00', remetente: 'tutor' as const },
      { id_user: 2, nome_tutor: 'Caio', conteudo: 'olá', created_at: '2026-11-10T11:00', remetente: 'cuidador' as const },
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'oi', created_at: '2026-11-10T10:00', remetente: 'tutor' as const }
    ];
    const r = agruparConversas(msgs);
    expect(r.length).toBe(2);
    expect(r[0]).toEqual(jasmine.objectContaining({ id_user: 1, ultima: 'oi de novo' }));
    expect(r[1]).toEqual(jasmine.objectContaining({ id_user: 2, remetente: 'cuidador' }));
  });

  it('conta só as mensagens do tutor ainda não lidas', () => {
    const msgs = [
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'c', remetente: 'tutor' as const, lida: false },
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'b', remetente: 'cuidador' as const, lida: false },
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'a', remetente: 'tutor' as const, lida: true },
      { id_user: 1, nome_tutor: 'Bia', conteudo: 'z', remetente: 'tutor' as const, lida: false }
    ];
    expect(agruparConversas(msgs)[0].naoLidas).toBe(2);
  });
});
