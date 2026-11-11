
# 🐾 PetNeighbor - Cadastro de Usuários & Pets (v1.1.0)

O **PetNeighbor** é um aplicativo mobile-first moderno e premium construído com **Angular 17+**, focado no cadastro e gerenciamento de tutores, pets e cuidadores dentro de uma rede de vizinhança integrada. O design do aplicativo conta com uma interface baseada em **Glassmorphism**, combinando uma paleta de cores elegantes e naturais com animações suaves e interações reativas.

---

## ✨ Funcionalidades Principais

*   👤 **Cadastro e Autenticação de Usuários**: Fluxo completo de registro e login com validações reativas em tempo real (`ReactiveFormsModule`), suporte para alternar visibilidade da senha e gestão de sessão reativa com Angular Signals.
*   🐾 **Gerenciamento de Pets**: Cadastro completo de pets contendo Nome, Idade, Porte (Pequeno, Médio, Grande), Peso e Descrição detalhada de temperamento.
*   📂 **Persistência de Sessão**: Restauração automática de login no aplicativo sincronizando o estado ativo em um Signal reativo e armazenamento local (`localStorage`).
*   🎨 **Design System Premium**: Interface mobile-first (largura máxima otimizada para `450px`) integrada com fontes modernas do Google (*Outfit* e *Material Symbols Rounded*), cards com efeito glassmorphism e micro-interações.
*   🔌 **Integração com Supabase**: Conectado diretamente a um backend Supabase via `HttpClient` e cabeçalhos customizados de API para operações CRUD completas nas tabelas de usuários e pets.

---

## 🛠️ Tecnologias Utilizadas

*   **Angular 17+** (Standalone Components, Signals e Router)
*   **RxJS** (gerenciamento de fluxos de dados assíncronos)
*   **Vanilla CSS** (design de ponta com variáveis CSS modernas)
*   **Supabase** (banco de dados PostgreSQL e API REST reativa)
*   **Google Fonts** (fontes Outfit e ícones Material Symbols)

---

## 📂 Estrutura do Projeto

Abaixo está o mapeamento dos principais diretórios e arquivos de componentes/lógicas da aplicação:

```text
src/
├── app/
│   ├── components/
│   │   ├── bottom-nav/      # Barra de navegação inferior flutuante
│   │   ├── home/            # Dashboard principal com estatísticas da comunidade e atalhos
│   │   ├── login/           # Tela de autenticação do tutor
│   │   ├── my-pets/         # Listagem de pets vinculados ao usuário logado
│   │   ├── pet-register/    # Formulário de cadastro de pets
│   │   ├── profile/         # Tela de perfil do usuário e logout
│   │   └── register/        # Tela de criação de nova conta de usuário
│   ├── models/
│   │   └── interfaces.ts    # Tipagens TypeScript (Usuario e Pet)
│   ├── services/
│   │   └── supabase.service.ts # Serviços de conexão e estado com a API do Supabase
│   ├── app.component.ts     # Componente raiz estrutural do app
│   ├── app.config.ts        # Configurações de provedores do Angular (HttpClient, Router)
│   └── app.routes.ts        # Roteamento de telas e redirecionamento de rotas
├── index.html               # Arquivo HTML principal do projeto
├── main.ts                  # Ponto de entrada da inicialização da aplicação
└── styles.css               # Folha de estilo global com variáveis de cores e tokens de design
```

---

## 🎨 Paleta de Cores e Tokens de Design

O design utiliza cores suaves e acolhedoras que remetem a natureza e bem-estar animal, configuradas no arquivo [styles.css]

*   🎨 **Terracota (`#C97B5E`)**: Cor principal de destaque (botões principais, links e títulos importantes).
*   🌿 **Salvia (`#9CAF9A`)**: Cor secundária para estados de sucesso, botões secundários e detalhes visuais.
*   🌾 **Areia (`#EDE4D1`)**: Cor de fundo da aplicação, oferecendo excelente legibilidade e elegância.
*   🥚 **Off-White (`#FAF6F1`)**: Cor dos cards e containers com efeito glassmorphism suave.
*   🖤 **Carvão (`#2E2A26`)**: Texto primário para alto contraste e sofisticação.

---

## 🚀 Novas funcionalidades (a partir da v1.1.0)

*   💬 **Chat em tempo real**: funcionalidade de mensagens entre usuários e cuidadores para combinar serviços e tirar dúvidas (componente `chat`).
*   📅 **Agenda e Agendamento**: tela de agenda e fluxo de agendamento de serviços/passeios com calendário e listas (`agenda`, `agendar`).
*   🔔 **Notificações**: sistema de notificações para lembretes de agendamentos e mensagens (`notificacoes`).
*   📍 **Geolocalização e busca de cuidadores próximos**: utilitários de localização para encontrar cuidadores na vizinhança e cálculo de distâncias (`geo.util.ts`).
*   🧑‍⚕️ **Cadastro e detalhe de cuidadores**: telas para registro e visualização de cuidadores com detalhes de serviços oferecidos (`cuidador-register`, `cuidador-detalhe`).
*   🔎 **Explorar e filtros**: página de exploração de cuidadores e serviços com filtros por distância, porte de pet e disponibilidade (`explorar`).
*   🧭 **Navegação móvel aprimorada**: barra de navegação inferior flutuante e fluxo de UX otimizado para telas pequenas (`bottom-nav`).

---

## 🔧 Melhorias e Observações

*   Atualizado o projeto para versão **v1.1.0** — inclui as novas telas e fluxos listados acima.
*   Arquivo de configuração/seed para banco: `supabase_setup.sql` (verifique credenciais e políticas de RLS antes de rodar em produção).
*   Recomenda-se testar os fluxos de autenticação e integrações com Supabase em um ambiente de desenvolvimento isolado.

---

## 📝 Atividades Pendentes

### 🔒 Segurança do banco de dados (prioridade alta)

Hoje o login é feito comparando e-mail/senha direto na tabela `usuarios`, as senhas são salvas em texto puro e as tabelas não têm RLS. Na prática, qualquer pessoa com a chave pública (visível no front-end) consegue ler, alterar ou apagar dados de qualquer tabela. Como paliativo, o `SupabaseService` já deixou de pedir as colunas `senha` e `documento`, mas a correção definitiva é:

- [ ] **Migrar para o Supabase Auth**: usar `supabase.auth.signUp()` / `signInWithPassword()` no cadastro e login de tutores e cuidadores. As senhas passam a ser guardadas com hash pelo Supabase.
- [ ] Adicionar a coluna `auth_id uuid references auth.users(id)` em `usuarios` e `cuidadores` e **remover as colunas `senha`**.
- [ ] Trocar o "usuário logado" salvo no `localStorage` pela sessão do Supabase Auth (`supabase.auth.getSession()` / `onAuthStateChange`).
- [ ] **Ativar RLS** (`alter table ... enable row level security`) em `usuarios`, `pets`, `cuidadores`, `agendamentos`, `mensagens` e `notificacoes`.
- [ ] Criar policies baseadas em `auth.uid()`:
    - `usuarios` / `pets` / `notificacoes`: cada usuário lê e altera só os próprios registros;
    - `agendamentos` / `mensagens`: acesso só para o tutor e o cuidador envolvidos;
    - `cuidadores`: leitura pública só das colunas sem dados sensíveis (via *view*), escrita só pelo próprio cuidador.
- [ ] Restringir o Realtime (chat/notificações) para respeitar as policies de RLS.
- [ ] No painel do Supabase: rodar o **Security Advisor**, ativar a confirmação de e-mail e a proteção contra senhas vazadas.
- [ ] Remover do `supabase_setup.sql` os cuidadores de exemplo com senha `123456`.
- [ ] (Opcional) Backup semanal via GitHub Actions com `pg_dump`, usando a connection string em um *secret*.

### 🛡️ Regras de negócio no banco (dependem do banco ativo)

O front já valida tudo isso, mas quem chama a API direto consegue pular essas validações. Por isso elas precisam existir também no banco:

- [ ] **`verificado`**: impedir que o cuidador defina o próprio selo, liberando a escrita da coluna só para admin. O front já não envia mais esse campo.
- [ ] **Preço do agendamento**: calcular por *trigger* a partir dos preços do cuidador, ignorando o `preco` enviado pelo tutor.
- [ ] **Status do agendamento**: o tutor só pode `Cancelar`. `Confirmar`, `Em andamento` e `Concluído` ficam só para o cuidador.
- [ ] **Notificações**: criar por *trigger* (ao inserir ou alterar agendamento e mensagem) em vez de pelo front, e impedir `insert` direto pela API.
- [ ] **Mensagens**: o `remetente` e o `id_user` precisam bater com o usuário logado (`auth.uid()`).
- [ ] **`CHECK` constraints**: `status` e `tipo_servico` só com os valores válidos, preços entre 0 e 1000, idade e peso positivos, `data` não pode estar no passado, e limite de tamanho em `bio`, `observacoes`, `conteudo` e nomes (os mesmos de `src/app/utils/limits.ts`).
- [ ] **`foto_url`**: aceitar só URLs do Storage do projeto (`CHECK` ou upload via Supabase Storage). O front já esconde fotos de outros domínios.
- [ ] **Coordenadas**: arredondar no banco também (o front já arredonda para ~100 m em novos cadastros) e atualizar os cuidadores já cadastrados.
- [ ] **CPF (`documento`)**: tirar do acesso público (tabela separada ou coluna sem `select` para `anon`).

### 🧩 Funcionalidades pendentes

- [x] Login e painel do cuidador (`/area-cuidador`): pedidos, ativos e histórico, confirmar, recusar, iniciar e concluir agendamentos (o tutor é notificado), lista de conversas e chat respondendo como cuidador.
- [x] Agenda e painel usando *join* do PostgREST (`select('*, cuidadores(nome), pets(nome_pet)')`).
- [x] Política de Privacidade (`/privacidade`), aceite obrigatório nos cadastros e avisos sobre CPF e localização.
- [x] Bundle inicial reduzido de ~675 kB para ~440 kB, com o `supabase-js` carregado sob demanda.

**Testar com o banco ativo:** login de cuidador, painel (joins com `usuarios` e `pets`), troca de status, chat do lado do cuidador e notificações para o tutor. O código foi testado com testes unitários e no navegador, mas sem acesso ao banco.

**Implementado no front, falta rodar `supabase_migration_funcionalidades.sql` no banco e testar.** Até a migração rodar, os cadastros falham, porque enviam a coluna `aceite_privacidade_em` e ela ainda não existe.

- [x] Registrar o aceite da política: os cadastros enviam `aceite_privacidade_em`.
- [x] Notificações para o cuidador (`notificacoes.id_cuidador`): novo pedido, cancelamento pelo tutor e mensagem nova. O painel recebe tudo em tempo real e mostra o quadro "Novidades" (no lugar do recarregamento a cada 60 s).
- [x] Excluir conta pelo app, no Perfil e na Área do cuidador. A migração liga as FKs com `on delete cascade`, então pets, agendamentos, mensagens e notificações são apagados junto.
- [x] Mensagens lidas: ao abrir o chat, as mensagens recebidas são marcadas como lidas, e o painel do cuidador mostra o contador de não lidas por conversa e na aba Chat.

---

## 🚀 Como Rodar Localmente

Siga os passos abaixo para executar a aplicação em sua máquina:

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em sua máquina.

### Execução

1.  **Clone o repositório ou navegue até a pasta:**
    ```bash
    cd angular-user-registration
    ```

2.  **Instale todas as dependências necessárias:**
    ```bash
    npm install
    ```

3.  **Inicie o servidor de desenvolvimento local:**
    ```bash
    npm start
    # ou alternativamente:
    ng serve
    ```

4.  **Acesse a aplicação no seu navegador:**
    Abra [http://localhost:4200](http://localhost:4200) para ver o aplicativo em execução.

---

## 📫 Contato / Contribuição

Contribuições são bem-vindas: abra issues e pull requests com descrições claras das mudanças. Para dúvidas rápidas, crie uma issue descrevendo o cenário e os logs relevantes.

---

Obrigado por usar o PetNeighbor! 🐶🐱