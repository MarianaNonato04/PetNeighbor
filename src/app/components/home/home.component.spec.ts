import { proximoAgendamento } from './home.component';
import { Agendamento } from '../../models/interfaces';

const ag = (id: number, data: string, hora: string, status: Agendamento['status']): Agendamento => ({
  id_agendamento: id, id_user: 1, id_cuidador: 2, id_pet: 3, tipo_servico: 'Passeio',
  data, hora, recorrencia: 'Único', preco: 30, status
});

describe('proximoAgendamento', () => {
  it('pega o mais cedo entre os ativos de hoje em diante', () => {
    const ags = [
      ag(1, '2026-11-12', '10:00', 'Confirmado'),
      ag(2, '2026-11-11', '15:00', 'Pendente'),
      ag(3, '2026-11-11', '09:00', 'Pendente'),
      ag(4, '2026-11-09', '08:00', 'Confirmado'),
      ag(5, '2026-11-10', '08:00', 'Cancelado'),
      ag(6, '2026-11-10', '07:00', 'Concluído')
    ];
    expect(proximoAgendamento(ags, '2026-11-10')?.id_agendamento).toBe(3);
  });

  it('retorna null quando não há nada ativo', () => {
    expect(proximoAgendamento([ag(1, '2026-11-01', '10:00', 'Confirmado')], '2026-11-10')).toBeNull();
  });
});
