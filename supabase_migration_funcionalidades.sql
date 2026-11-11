begin;

alter table public.usuarios   add column if not exists aceite_privacidade_em timestamptz;
alter table public.cuidadores add column if not exists aceite_privacidade_em timestamptz;

alter table public.notificacoes alter column id_user drop not null;
alter table public.notificacoes add column if not exists id_cuidador bigint;
alter table public.notificacoes drop constraint if exists notificacoes_destinatario_chk;
alter table public.notificacoes add constraint notificacoes_destinatario_chk
  check ((id_user is null) <> (id_cuidador is null));
create index if not exists notificacoes_id_cuidador_idx on public.notificacoes (id_cuidador);

alter table public.notificacoes drop constraint if exists notificacoes_id_cuidador_fkey;
alter table public.notificacoes add constraint notificacoes_id_cuidador_fkey
  foreign key (id_cuidador) references public.cuidadores(id_cuidador) on delete cascade;

alter table public.pets drop constraint if exists pets_id_user_fkey;
alter table public.pets add constraint pets_id_user_fkey
  foreign key (id_user) references public.usuarios(id_user) on delete cascade not valid;

do $$
declare r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tabela, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.contype = 'f'
      and c.connamespace = 'public'::regnamespace
      and c.confdeltype <> 'c'
      and c.confrelid in (
        to_regclass('public.usuarios'), to_regclass('public.cuidadores'), to_regclass('public.pets'),
        to_regclass('public.agendamentos'), to_regclass('public.posts'))
  loop
    execute format('alter table %s drop constraint %I', r.tabela, r.conname);
    execute format('alter table %s add constraint %I %s on delete cascade', r.tabela, r.conname,
      regexp_replace(r.def, ' ON DELETE (SET NULL|SET DEFAULT|RESTRICT)( \([^)]*\))?', ''));
  end loop;
end $$;

commit;

select c.conrelid::regclass as tabela, c.conname, c.confdeltype = 'c' as cascade, c.convalidated as validada
from pg_constraint c
where c.contype = 'f' and c.connamespace = 'public'::regnamespace
order by 1, 2;
