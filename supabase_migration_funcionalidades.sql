alter table public.usuarios   add column if not exists aceite_privacidade_em timestamptz;
alter table public.cuidadores add column if not exists aceite_privacidade_em timestamptz;

alter table public.notificacoes alter column id_user drop not null;
alter table public.notificacoes add column if not exists id_cuidador bigint;
alter table public.notificacoes drop constraint if exists notificacoes_destinatario_chk;
alter table public.notificacoes add constraint notificacoes_destinatario_chk
  check ((id_user is null) <> (id_cuidador is null));
create index if not exists notificacoes_id_cuidador_idx on public.notificacoes (id_cuidador);

alter table public.pets drop constraint if exists pets_id_user_fkey;
alter table public.pets add constraint pets_id_user_fkey
  foreign key (id_user) references public.usuarios(id_user) on delete cascade;

alter table public.agendamentos drop constraint if exists agendamentos_id_user_fkey;
alter table public.agendamentos add constraint agendamentos_id_user_fkey
  foreign key (id_user) references public.usuarios(id_user) on delete cascade;
alter table public.agendamentos drop constraint if exists agendamentos_id_cuidador_fkey;
alter table public.agendamentos add constraint agendamentos_id_cuidador_fkey
  foreign key (id_cuidador) references public.cuidadores(id_cuidador) on delete cascade;
alter table public.agendamentos drop constraint if exists agendamentos_id_pet_fkey;
alter table public.agendamentos add constraint agendamentos_id_pet_fkey
  foreign key (id_pet) references public.pets(id_pet) on delete cascade;

alter table public.mensagens drop constraint if exists mensagens_id_user_fkey;
alter table public.mensagens add constraint mensagens_id_user_fkey
  foreign key (id_user) references public.usuarios(id_user) on delete cascade;
alter table public.mensagens drop constraint if exists mensagens_id_cuidador_fkey;
alter table public.mensagens add constraint mensagens_id_cuidador_fkey
  foreign key (id_cuidador) references public.cuidadores(id_cuidador) on delete cascade;

alter table public.notificacoes drop constraint if exists notificacoes_id_user_fkey;
alter table public.notificacoes add constraint notificacoes_id_user_fkey
  foreign key (id_user) references public.usuarios(id_user) on delete cascade;
alter table public.notificacoes drop constraint if exists notificacoes_id_cuidador_fkey;
alter table public.notificacoes add constraint notificacoes_id_cuidador_fkey
  foreign key (id_cuidador) references public.cuidadores(id_cuidador) on delete cascade;
alter table public.notificacoes drop constraint if exists notificacoes_id_agendamento_fkey;
alter table public.notificacoes add constraint notificacoes_id_agendamento_fkey
  foreign key (id_agendamento) references public.agendamentos(id_agendamento) on delete cascade;
