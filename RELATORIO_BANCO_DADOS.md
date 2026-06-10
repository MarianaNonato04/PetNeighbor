# 📊 Relatório de Alterações no Banco de Dados — PetNeighbor

> Documento gerado para registrar **tudo que precisa ser criado/alterado** no banco
> de dados **Supabase (PostgreSQL)** para suportar as novas funcionalidades
> implementadas no front-end Angular.
>
> **Data:** 09/06/2026
> **Banco:** Supabase / PostgreSQL (projeto `hrfestijxvifjgtmcxan`)
> **Custo:** R$ 0,00 — tudo roda no _free tier_ do Supabase + APIs gratuitas do navegador.

---

## 1. Visão geral

Foram implementados os seguintes requisitos funcionais do documento de projeto:

| Requisito | Funcionalidade | Tabelas envolvidas |
|-----------|----------------|--------------------|
| **RF01** | Cadastro de cuidadores | `cuidadores` (nova) |
| **RF02 / RF07** | Agendamento de serviços (único ou recorrente) | `agendamentos` (nova) |
| **RF03** | Listar cuidadores próximos por geolocalização | `cuidadores` (campos `latitude`/`longitude`) |
| **RF08** | Filtrar cuidadores por serviço e preço | `cuidadores` (campos `servicos`, `preco_*`) |
| **RF09** | Chat em tempo real | `mensagens` (nova) + Supabase Realtime |
| **RF10** | Notificações de status | `notificacoes` (nova) + Supabase Realtime |

> **Não implementado nesta etapa:** RF04 (pagamentos) — exige gateway de pagamento
> com custos e conformidade PCI; recomendado como trabalho futuro.

### APIs gratuitas utilizadas
- **Geolocation API** do navegador (`navigator.geolocation`) → posição do tutor (RF03). Sem custo, nativa.
- **Cálculo de distância (Haversine)** feito no front-end → não exige API de mapas paga.
- **Supabase Realtime** (free tier) → chat e notificações em tempo real (RF09/RF10).

---

## 2. Tabelas existentes (referência — não alteradas)

```text
usuarios ( id_user, nome, idade, email, senha )
pets     ( id_pet, nome_pet, idade_pet, describ_pet, peso, porte, id_user )
```

---

## 3. Tabelas NOVAS a serem criadas

### 3.1 `cuidadores` — RF01 / RF03 / RF08

Armazena o perfil dos cuidadores, suas coordenadas (para a busca por proximidade)
e os preços por tipo de serviço.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id_cuidador` | `bigint` (PK, identity) | Identificador único |
| `nome` | `text` | Nome do cuidador |
| `email` | `text` (único) | E-mail de contato/login |
| `senha` | `text` | Senha (ver nota de segurança no item 6) |
| `bio` | `text` | Descrição/experiência |
| `cidade` | `text` | Cidade/bairro exibido |
| `latitude` | `double precision` | Coordenada — usada no cálculo de distância (RF03) |
| `longitude` | `double precision` | Coordenada — usada no cálculo de distância (RF03) |
| `servicos` | `text[]` | Serviços oferecidos: `Passeio`, `Alimentação`, `Companhia` |
| `preco_passeio` | `numeric(10,2)` | Preço do passeio |
| `preco_alimentacao` | `numeric(10,2)` | Preço da alimentação |
| `preco_companhia` | `numeric(10,2)` | Preço da companhia |
| `documento` | `text` | Documento informado para verificação (RF01) |
| `verificado` | `boolean` (default `false`) | Indica triagem aprovada |
| `foto_url` | `text` (nullable) | URL da foto de perfil (opcional) |
| `created_at` | `timestamptz` (default `now()`) | Data de cadastro |

```sql
create table public.cuidadores (
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
```

---

### 3.2 `agendamentos` — RF02 / RF07

Registra os agendamentos entre tutor e cuidador, com recorrência e status.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id_agendamento` | `bigint` (PK, identity) | Identificador único |
| `id_user` | `bigint` (FK → usuarios) | Tutor que agendou |
| `id_cuidador` | `bigint` (FK → cuidadores) | Cuidador escolhido |
| `id_pet` | `bigint` (FK → pets) | Pet do serviço |
| `tipo_servico` | `text` | `Passeio` \| `Alimentação` \| `Companhia` |
| `data` | `date` | Data do serviço |
| `hora` | `text` | Horário (HH:mm) |
| `recorrencia` | `text` | `Único` \| `Diário` \| `Semanal` (RF07) |
| `preco` | `numeric(10,2)` | Valor estimado |
| `observacoes` | `text` | Instruções do tutor |
| `status` | `text` (default `Pendente`) | `Pendente`, `Confirmado`, `Em andamento`, `Concluído`, `Cancelado` |
| `created_at` | `timestamptz` (default `now()`) | Criação |

```sql
create table public.agendamentos (
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
```

---

### 3.3 `mensagens` — RF09 (chat em tempo real)

Mensagens trocadas entre tutor e cuidador. O campo `conversa_id` agrupa a conversa
(formato `t{idTutor}-c{idCuidador}`).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id_mensagem` | `bigint` (PK, identity) | Identificador único |
| `conversa_id` | `text` | Agrupador da conversa (ex.: `t1-c5`) |
| `id_user` | `bigint` (FK → usuarios) | Tutor da conversa |
| `id_cuidador` | `bigint` (FK → cuidadores) | Cuidador da conversa |
| `remetente` | `text` | `tutor` \| `cuidador` |
| `conteudo` | `text` | Texto da mensagem |
| `lida` | `boolean` (default `false`) | Status de leitura |
| `created_at` | `timestamptz` (default `now()`) | Envio |

```sql
create table public.mensagens (
  id_mensagem bigint generated always as identity primary key,
  conversa_id text not null,
  id_user     bigint not null references public.usuarios(id_user),
  id_cuidador bigint not null references public.cuidadores(id_cuidador),
  remetente   text not null,
  conteudo    text not null,
  lida        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_mensagens_conversa on public.mensagens(conversa_id);
```

---

### 3.4 `notificacoes` — RF10

Notificações exibidas ao usuário (sino na home + tela dedicada), atualizadas em tempo real.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id_notificacao` | `bigint` (PK, identity) | Identificador único |
| `id_user` | `bigint` (FK → usuarios) | Destinatário |
| `tipo` | `text` | `agendamento` \| `mensagem` \| `sistema` |
| `titulo` | `text` | Título curto |
| `mensagem` | `text` | Texto da notificação |
| `lida` | `boolean` (default `false`) | Status de leitura |
| `id_agendamento` | `bigint` (FK → agendamentos, nullable) | Vínculo opcional |
| `created_at` | `timestamptz` (default `now()`) | Criação |

```sql
create table public.notificacoes (
  id_notificacao bigint generated always as identity primary key,
  id_user        bigint not null references public.usuarios(id_user),
  tipo           text not null,
  titulo         text not null,
  mensagem       text not null,
  lida           boolean not null default false,
  id_agendamento bigint references public.agendamentos(id_agendamento),
  created_at     timestamptz not null default now()
);

create index idx_notificacoes_user on public.notificacoes(id_user);
```

---

## 4. Habilitar o Realtime (RF09 / RF10)

No painel Supabase: **Database → Replication → `supabase_realtime`** e adicione
as tabelas `mensagens` e `notificacoes`. Ou via SQL:

```sql
alter publication supabase_realtime add table public.mensagens;
alter publication supabase_realtime add table public.notificacoes;
```

> Sem isso, o front-end ainda funciona (busca os dados ao abrir a tela), mas as
> mensagens/notificações **não chegam em tempo real**.

---

## 5. Dados de exemplo (opcional — para testar o Explorar)

Coordenadas de exemplo na cidade de São Paulo. Ajuste `latitude`/`longitude`
para perto da sua localização para ver as distâncias funcionando.

```sql
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
```

---

## 6. ⚠️ Notas de segurança (recomendações)

Estas observações alinham-se ao **Plano de Segurança** do documento do projeto
(RLS, LGPD, mitigação de acesso indevido):

1. **Senhas em texto puro** — tanto `usuarios.senha` quanto `cuidadores.senha`
   guardam a senha sem hash (padrão herdado do projeto). **Recomendado:** migrar
   para o **Supabase Auth** (faz hash + JWT automaticamente) ou ao menos aplicar
   `crypt()`/`bcrypt` via `pgcrypto`.

2. **Row Level Security (RLS)** — as tabelas estão acessíveis pela chave pública.
   Para produção, habilite RLS e crie políticas para que cada usuário só leia/altere
   seus próprios registros. Exemplo de ponto de partida:

   ```sql
   alter table public.agendamentos enable row level security;
   alter table public.mensagens     enable row level security;
   alter table public.notificacoes  enable row level security;
   -- criar policies usando auth.uid() após adotar o Supabase Auth
   ```

3. **Geolocalização (PII)** — `latitude`/`longitude` são dados sensíveis (LGPD).
   Em produção, considere armazenar apenas a região aproximada ou aplicar
   _fuzzing_ nas coordenadas exibidas.

---

## 7. Resumo do que adicionar no Supabase

- [ ] Criar tabela **`cuidadores`**
- [ ] Criar tabela **`agendamentos`**
- [ ] Criar tabela **`mensagens`**
- [ ] Criar tabela **`notificacoes`**
- [ ] Adicionar `mensagens` e `notificacoes` à publicação **`supabase_realtime`**
- [ ] (Opcional) Inserir cuidadores de exemplo para testar o Explorar
- [ ] (Produção) Revisar segurança: hash de senha, RLS e tratamento de geolocalização
