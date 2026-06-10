
create table if not exists public.cuidadores (
  id_cuidador        bigint generated always as identity primary key,
  nome               text not null,
  email              text not null unique,
  senha              text not null,
  bio                text,
  cidade             text,
  latitude           double precision not null,
  longitude          double precision not null,
  servicos           text[] not null default '{}',
  preco_passeio      numeric(10,2) default 0,
  preco_alimentacao  numeric(10,2) default 0,
  preco_companhia    numeric(10,2) default 0,
  documento          text,
  verificado         boolean not null default false,
  foto_url           text,
  created_at         timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id_agendamento bigint generated always as identity primary key,
  id_user        bigint not null references public.usuarios(id_user),
  id_cuidador    bigint not null references public.cuidadores(id_cuidador),
  id_pet         bigint not null references public.pets(id_pet),
  tipo_servico   text not null,
  data           date not null,
  hora           text not null,
  recorrencia    text not null default 'Único',
  preco          numeric(10,2) default 0,
  observacoes    text,
  status         text not null default 'Pendente',
  created_at     timestamptz not null default now()
);

create table if not exists public.mensagens (
  id_mensagem bigint generated always as identity primary key,
  conversa_id text not null,
  id_user     bigint not null references public.usuarios(id_user),
  id_cuidador bigint not null references public.cuidadores(id_cuidador),
  remetente   text not null,
  conteudo    text not null,
  lida        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_mensagens_conversa on public.mensagens(conversa_id);

create table if not exists public.notificacoes (
  id_notificacao bigint generated always as identity primary key,
  id_user        bigint not null references public.usuarios(id_user),
  tipo           text not null,
  titulo         text not null,
  mensagem       text not null,
  lida           boolean not null default false,
  id_agendamento bigint references public.agendamentos(id_agendamento),
  created_at     timestamptz not null default now()
);
create index if not exists idx_notificacoes_user on public.notificacoes(id_user);

alter publication supabase_realtime add table public.mensagens;
alter publication supabase_realtime add table public.notificacoes;

insert into public.cuidadores
  (nome, email, senha, bio, cidade, latitude, longitude, servicos,
   preco_passeio, preco_alimentacao, preco_companhia, documento, verificado)
values
  ('Ana Souza', 'ana@cuidadores.com', '123456',
   'Adoro cães e tenho 5 anos de experiência com passeios.',
   'Vila Mariana, SP', -23.5895, -46.6340,
   '{Passeio,Companhia}', 35, 0, 30, '111.111.111-11', true),
  ('Bruno Lima', 'bruno@cuidadores.com', '123456',
   'Cuidador apaixonado por gatos e cães de todos os portes.',
   'Pinheiros, SP', -23.5670, -46.7020,
   '{Passeio,Alimentação,Companhia}', 40, 25, 35, '222.222.222-22', true),
  ('Carla Mendes', 'carla@cuidadores.com', '123456',
   'Disponível para alimentação e companhia durante viagens.',
   'Moema, SP', -23.6010, -46.6630,
   '{Alimentação,Companhia}', 0, 20, 28, '333.333.333-33', false);
