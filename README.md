# 🎓 EstudaAí — Organizador de Estudos Estilo Notion

O **EstudaAí** é uma aplicação web completa (Single Page Application) desenvolvida para gerenciar rotinas de estudo de forma centralizada, produtiva e altamente visual. Inspirado no design minimalista e modular do Notion, o projeto foi construído utilizando **HTML5, CSS3 e JavaScript (ES6+) puros**, seguindo rigorosamente a arquitetura de software **MVC (Model-View-Controller)** para máxima robustez e escalabilidade.

---

## 🚀 Funcionalidades Principais

*   **📊 Dashboard Inteligente**: Painel principal com estatísticas de progresso por matéria, tarefas pendentes, eventos futuros integrados e mensagem de boas-vindas dinâmica.
*   **📂 Sidebar Hierárquica**: Navegação dinâmica para criação e exclusão de **Matérias**, com abas exclusivas para Páginas, Tarefas, Materiais e Mapas Mentais vinculados a cada disciplina.
*   **✍️ Editor de Blocos (estilo Notion)**: Editor de conteúdo modular e interativo. Pressione `/` a qualquer momento para abrir o menu de blocos (Títulos H1-H3, Listas Ordenadas/Não Ordenadas, Checkboxes Interativos, Divisores, Citações e Parágrafos) com salvamento automático.
*   **📋 Kanban de Tarefas**: Gerenciador de tarefas com colunas *A Fazer*, *Em Progresso* e *Concluído*, com badges de prioridade (Alta, Média, Baixa) e alertas visuais de prazos vencidos.
*   **📅 Calendário Mensal Integrado**: Grade de calendário interativa que exibe automaticamente prazos de tarefas e permite agendar eventos personalizados de estudo.
*   **📥 Gerenciador de Materiais**: Upload de arquivos locais (PDF, Imagens, Vídeos, Áudios) com pré-visualização integrada e players nativos direto na aplicação.
*   **🧠 Editor de Mapas Mentais (Canvas)**: Criação de mapas conceituais e mentais interativos usando a API Canvas 2D nativa, com suporte a criação de nós com clique duplo, conexões dinâmicas segurando `Shift`, edição de texto e cores inline, e exportação do mapa como imagem PNG.
*   **⏱ Temporizador Pomodoro**: Timer interativo com transições de status (Foco, Pausa Curta, Pausa Longa), feedbacks sonoros gerados por Web Audio API e contador de sessões.
*   **🌓 Tema Dark / Light**: Customização total de interface através de tokens de design em CSS Variables, alternável com um clique no rodapé da barra lateral.

---

## 🏗 Arquitetura e Decisões Técnicas

O projeto destaca-se por **não utilizar nenhuma biblioteca externa**, alcançando alta performance e independência tecnológica:

1.  **Padrão MVC**: Separação completa de dados (`Models`), interfaces gráficas (`Views`) e orquestração de negócios (`AppController`).
2.  **EventBus (Pub/Sub)**: Sistema global de mensageria assíncrona, garantindo que os componentes se comuniquem de forma totalmente desacoplada.
3.  **Persistência Híbrida**:
    *   **LocalStorage**: Armazenamento rápido do estado leve da aplicação (páginas, tarefas, notas, eventos).
    *   **IndexedDB**: Banco de dados relacional local usado para armazenar arquivos binários pesados de upload (Blobs) de materiais, contornando o limite de tamanho do LocalStorage.
4.  **Aparência Premium**: Design de alta fidelidade visual, com suporte nativo a micro-animações, efeitos *blur/backdrop* (glassmorphism) e paleta baseada em HSL.

---

## 📁 Estrutura do Projeto

```text
Organizador_Estudos/
├── index.html          # Arquivo de entrada principal
├── css/                # Folhas de estilo modulares
│   ├── reset.css       # Normalização de estilos
│   ├── variables.css   # Tokens de design (Light & Dark themes)
│   ├── layout.css      # Sistema de Grid global e Shell
│   ├── components.css  # Componentes globais (Kanban, Timer, Modals, Buttons)
│   ├── calendar.css    # Estilização exclusiva do Calendário
│   ├── mindmap.css     # Estilização exclusiva do Canvas e ferramentas de Mapa Mental
│   └── animations.css  # Transições e micro-animações
└── js/                 # Arquitetura MVC e Bootstrapping
    ├── app.js          # Arquivo de inicialização (Bootstrap)
    ├── utils/          # Módulos utilitários (eventBus, storage wrappers)
    ├── controllers/    # Controlador central da aplicação (AppController)
    ├── models/         # Gerenciadores de Estado (Subject, Page, Task, etc.)
    └── views/          # Renderização e captação de eventos (SidebarView, EditorView, etc.)
```

---

## 🛠 Como Executar Localmente

Como a aplicação é estática e utiliza módulos nativos de JavaScript (`type="module"`), ela precisa ser servida em um servidor HTTP local para evitar erros de CORS ao ler os arquivos de scripts:

### Opção 1: Usando Python (Recomendado)
Se você tiver o Python instalado em sua máquina, basta rodar o comando abaixo na pasta raiz do projeto:

```bash
python3 -m http.server 8765
```

Em seguida, abra o endereço em seu navegador:
👉 **[http://localhost:8765](http://localhost:8765)**

### Opção 2: Usando Node.js (Live Server / HTTP-Server)
Se preferir utilizar Node.js, você pode instalar e rodar um servidor de desenvolvimento rápido:

```bash
npx http-server -p 8765
```

---

## 📝 Autor e Contribuições

Criado e mantido por **[Julianacardoso1984](https://github.com/Julianacardoso1984)**. Contribuições, ideias e pull requests são super bem-vindos!

---
*Feito com ❤️ para revolucionar a sua produtividade nos estudos.*
