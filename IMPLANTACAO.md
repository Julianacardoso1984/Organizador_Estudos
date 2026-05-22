# Documentação de Implantação — EstudaAí

O **EstudaAí** é uma Single Page Application (SPA) desenvolvida com **HTML5, CSS3 e JavaScript (ES6+) puros**. Por não depender de frameworks complexos (como React ou Angular) ou de um backend próprio (Node.js, Python, etc.), o processo de implantação do sistema é direto e envolve apenas a hospedagem de arquivos estáticos.

---

## 🛠 Pré-requisitos

Não há necessidade de instalar dependências via `npm`, `yarn` ou bancos de dados.
Todos os recursos necessários estão contidos nos diretórios do projeto:
* `index.html` (Ponto de entrada)
* `/css/` (Folhas de estilo)
* `/js/` (Scripts, Modelos, Visões e Controladores)
* `/assets/` (Imagens e ícones)

> [!NOTE]
> Os dados da aplicação são salvos localmente no navegador do usuário utilizando **LocalStorage** e **IndexedDB**. 

---

## 💻 Executando Localmente (Ambiente de Desenvolvimento)

Para rodar o projeto em sua máquina para testes ou desenvolvimento, você precisa de um servidor web simples para evitar bloqueios de CORS (Cross-Origin Resource Sharing) ao carregar módulos ES6 e APIs.

### Opção 1: Usando VS Code (Recomendado)
1. Instale a extensão **Live Server** no Visual Studio Code.
2. Abra a pasta do projeto no VS Code.
3. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.
4. O navegador abrirá automaticamente em `http://127.0.0.1:5500`.

### Opção 2: Usando Python
Se você tiver o Python instalado:
```bash
# Abra o terminal na pasta do projeto e digite:
python -m http.server 8000
# Acesse no navegador: http://localhost:8000
```

### Opção 3: Usando Node.js (http-server)
Se você tiver o Node.js instalado:
```bash
npx http-server -p 8080
# Acesse no navegador: http://localhost:8080
```

---

## 🚀 Implantação em Produção (Hospedagem)

Como o projeto é totalmente estático, ele pode ser hospedado de forma gratuita em diversas plataformas de hospedagem na nuvem.

### 1. Vercel (Recomendado pela simplicidade)
A Vercel é excelente para projetos front-end estáticos.
1. Crie uma conta na [Vercel](https://vercel.com).
2. Instale o Vercel CLI ou conecte seu repositório do GitHub.
3. Se usar o CLI, rode o comando na pasta do projeto:
   ```bash
   npx vercel
   ```
4. Siga as instruções no terminal. Nenhuma configuração de `build command` é necessária.

### 2. GitHub Pages
Se o código estiver no GitHub, o GitHub Pages é a forma mais natural de hospedar:
1. Suba o código para um repositório público no GitHub.
2. Vá em **Settings** > **Pages**.
3. Em "Source", selecione a branch `main` ou `master` e a pasta `/(root)`.
4. Salve e aguarde alguns minutos. Seu site estará disponível em `https://seunome.github.io/nome-do-repositorio/`.

### 3. Netlify
1. Crie uma conta no [Netlify](https://netlify.com).
2. Arraste e solte a pasta do projeto diretamente no painel do Netlify, **OU** conecte seu repositório do GitHub.
3. O Netlify publicará o site instantaneamente e fornecerá uma URL pública.

---

## 🔐 Configurações de Integrações e APIs

O sistema possui integrações nativas com serviços externos. Nenhuma configuração no servidor é necessária, pois as requisições são feitas pelo navegador do cliente.

* **Inteligência Artificial (Google Gemini):** O usuário insere a chave da API (API Key) diretamente na interface da aplicação (nos modais de IA de Mapas Mentais ou Flashcards). A chave é salva apenas no cache local do dispositivo do usuário por questões de segurança.
* **Spotify / Discord:** Funcionam através de Web Embeds e OAuth client-side. Não é necessário hospedar um servidor de autenticação.

---

## 💾 Gestão de Dados (Backup e Restore)

Como a aplicação é 100% *Client-Side* e *Offline-First*:
* **Armazenamento:** Textos, configurações, cronogramas e dados de rotina ficam no `LocalStorage`.
* **Arquivos Pesados:** Arquivos PDF, imagens, vídeos de materiais de estudo são guardados no `IndexedDB` do próprio navegador do usuário.
* **Backup:** O usuário deve usar a função **Exportar Backup** nas configurações da barra lateral para baixar seus dados como um arquivo `.json`. Em um novo dispositivo, ele deve usar a função **Importar Backup**.

---

## 🔄 Atualizações do Sistema

Para atualizar a aplicação, basta modificar os arquivos e realizar o upload da nova versão no servidor estático escolhido (fazendo `git push` caso use Vercel/Netlify/GitHub Pages). 
**Atenção:** Como o navegador dos usuários pode armazenar arquivos CSS/JS em cache, é recomendável usar ferramentas de cache buster (adicionar `?v=1.1` na importação dos scripts no `index.html`) caso haja atualizações importantes de layout ou lógica.
