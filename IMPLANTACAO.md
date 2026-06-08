# Guia de Implantação (Deployment) - Organizador de Estudos

Este documento descreve o passo a passo para colocar o Organizador de Estudos no ar, configurando tanto o banco de dados (Supabase) quanto a hospedagem da interface (Vercel).

---

## 1. Configurando o Banco de Dados (Supabase)

O Organizador de Estudos utiliza o **Supabase** como backend para salvar contas de usuários e sincronizar todas as informações na nuvem.

### Passo 1.1: Criar o Projeto
1. Crie uma conta no [Supabase](https://supabase.com).
2. Clique em **"New Project"** e preencha as informações (nome, senha do banco, região).
3. Aguarde o banco de dados terminar de ser provisionado.

### Passo 1.2: Criar as Tabelas e Permissões (SQL)
1. No menu lateral do Supabase, clique em **SQL Editor**.
2. Abra o arquivo `supabase_schema.sql` que está na pasta do seu projeto.
3. Copie todo o conteúdo desse arquivo, cole no editor do Supabase e clique no botão **Run** (canto inferior direito).
4. Se der "Success", todas as tabelas e regras de segurança foram criadas perfeitamente.

### Passo 1.3: Configurar Autenticação (Login)
Para evitar bloqueios de taxa de envio de e-mails no plano gratuito:
1. Vá no menu lateral e clique em **Authentication** -> **Providers** -> **Email**.
2. **Desmarque** a opção "Confirm email" (isso permite que novos usuários criem conta e já entrem no app sem precisar clicar em link de confirmação no e-mail).
3. Salve as alterações.

### Passo 1.4: Obter as Credenciais
1. Vá no menu lateral e clique em **Project Settings** (o ícone de engrenagem) -> **API**.
2. Copie a `Project URL`.
3. Copie a `Project API Key` (a que tem a tag `anon` / `public`).
4. Abra o arquivo do projeto `/js/utils/supabaseClient.js` e cole essas duas informações no topo do arquivo (nas variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY`).

---

## 2. Hospedando o Site (Vercel)

A interface do projeto é puramente estática (HTML, CSS, JS), o que torna a implantação na **Vercel** extremamente simples, rápida e 100% gratuita.

### Passo 2.1: Subindo o código para o GitHub (Recomendado)
A melhor forma de integrar com a Vercel é tendo seu código no GitHub:
1. Crie um repositório no [GitHub](https://github.com).
2. Envie todos os arquivos da pasta do Organizador de Estudos para este repositório.

### Passo 2.2: Conectando com a Vercel
1. Crie uma conta ou faça login na [Vercel](https://vercel.com).
2. Clique no botão **"Add New..."** e escolha **"Project"**.
3. Autorize a Vercel a ler seu GitHub e selecione o repositório do "Organizador de Estudos" clicando em **Import**.
4. Na tela de configuração de Deploy:
   - **Framework Preset**: Deixe como `Other`.
   - **Root Directory**: Deixe como `./` (raiz).
   - **Build Command**: Deixe em branco.
5. Clique no botão **Deploy**.

### Passo 2.3: Acessando o Site
Após alguns segundos, a Vercel terminará o processamento e disponibilizará um link público seguro (HTTPS). Seu Organizador de Estudos estará no ar, conectado com o Supabase e pronto para uso mundial!

---

## 3. Manutenção e Atualizações

- **Para atualizar o código:** Toda vez que você modificar um arquivo HTML, CSS ou JS localmente e enviar as atualizações (commit/push) para o GitHub, a Vercel identificará automaticamente e atualizará o site em produção em questão de segundos.
- **Arquivos Antigos no Cache:** Como a Vercel e o navegador cacheiam (guardam) os arquivos Javascript, sempre que você modificar um arquivo JS importante, é recomendável ir no arquivo `index.html` e alterar o número da versão na importação. Exemplo: `<script src="js/app.js?v=3"></script>`.
