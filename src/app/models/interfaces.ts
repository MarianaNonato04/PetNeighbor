export interface Usuario {
  id_user?: number;
  nome: string;
  idade: number;
  email: string;
  senha?: string;
  aceite_privacidade_em?: string;
}

export interface Pet {
  id_pet?: number;
  nome_pet: string;
  especie?: string;
  idade_pet: number;
  describ_pet: string;
  peso: number;
  porte: 'Pequeno' | 'Médio' | 'Grande';
  id_user: number;
}

export type TipoServico = 'Passeio' | 'Alimentação' | 'Companhia';

export const SERVICOS: TipoServico[] = ['Passeio', 'Alimentação', 'Companhia'];

export interface Cuidador {
  id_cuidador?: number;
  nome: string;
  email: string;
  senha?: string;
  bio: string;
  cidade: string;

  latitude: number;
  longitude: number;

  servicos: TipoServico[];

  preco_passeio: number;
  preco_alimentacao: number;
  preco_companhia: number;

  documento?: string;
  verificado?: boolean;
  foto_url?: string;
  aceite_privacidade_em?: string;
  created_at?: string;
}

export interface CuidadorProximo extends Cuidador {
  distancia_km: number;
}

export type StatusAgendamento =
  | 'Pendente'
  | 'Confirmado'
  | 'Em andamento'
  | 'Concluído'
  | 'Cancelado';

export type Recorrencia = 'Único' | 'Diário' | 'Semanal';

export interface Agendamento {
  id_agendamento?: number;
  id_user: number;
  id_cuidador: number;
  id_pet: number;
  tipo_servico: string;
  data: string;        
  hora: string;        
  recorrencia: Recorrencia;
  preco: number;
  observacoes?: string;
  status: StatusAgendamento;
  created_at?: string;

  nome_cuidador?: string;
  nome_tutor?: string;
  nome_pet?: string;
}

export interface Mensagem {
  id_mensagem?: number;
  conversa_id: string;          
  id_user: number;              
  id_cuidador: number;          
  remetente: 'tutor' | 'cuidador';
  conteudo: string;
  lida?: boolean;
  created_at?: string;
}

export interface Notificacao {
  id_notificacao?: number;
  
  id_user?: number;
  id_cuidador?: number;
  tipo: 'agendamento' | 'mensagem' | 'sistema';
  titulo: string;
  mensagem: string;
  lida?: boolean;
  id_agendamento?: number;
  created_at?: string;
}

export type AutorTipo = 'tutor' | 'cuidador';

export interface Post {
  id_post?: number;
  id_user?: number | null;
  id_cuidador?: number | null;
  autor_tipo: AutorTipo;
  descricao: string;
  fotos: string[];
  created_at?: string;
  autor_nome?: string;
  autor_foto?: string | null;
  qtd_curtidas?: number;
  curtido_por_mim?: boolean;
}

export interface Comentario {
  id_comentario?: number;
  id_post: number;
  id_user?: number | null;
  id_cuidador?: number | null;
  autor_tipo: AutorTipo;
  conteudo: string;
  created_at?: string;
  autor_nome?: string;
  autor_foto?: string | null;
}
