# 🐾 PetNeighbor - Cadastro de Usuários & Pets

O **PetNeighbor** é um aplicativo mobile-first moderno e premium construído com **Angular 17+**, focado no cadastro e gerenciamento de tutores e seus pets dentro de uma rede de vizinhança integrada. O design do aplicativo conta com uma interface baseada em **Glassmorphism**, combinando uma paleta de cores elegantes e naturais com animações suaves e interações reativas.

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

O design utiliza cores suaves e acolhedoras que remetem a natureza e bem-estar animal, configuradas no arquivo [styles.css](file:///c:/Users/marin/Desktop/Projetos/angular-user-registration/src/styles.css):

*   🎨 **Terracota (`#C97B5E`)**: Cor principal de destaque (botões principais, links e títulos importantes).
*   🌿 **Salvia (`#9CAF9A`)**: Cor secundária para estados de sucesso, botões secundários e detalhes visuais.
*   🌾 **Areia (`#EDE4D1`)**: Cor de fundo da aplicação, oferecendo excelente legibilidade e elegância.
*   🥚 **Off-White (`#FAF6F1`)**: Cor dos cards e containers com efeito glassmorphism suave.
*   🖤 **Carvão (`#2E2A26`)**: Texto primário para alto contraste e sofisticação.

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