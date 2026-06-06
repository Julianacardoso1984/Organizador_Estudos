'use strict';

/**
 * AuthView — Tela de Autenticação (Login e Cadastro)
 */
class AuthView {
  constructor() {
    // Cria o container caso não exista no HTML
    let el = document.getElementById('view-auth');
    if (!el) {
      el = document.createElement('div');
      el.id = 'view-auth';
      document.body.appendChild(el);
    }
    this.el = el;
    this.isLoginMode = true;
  }

  render() {
    const isConfigured = typeof window.SupabaseClient !== 'undefined' && window.SupabaseClient !== null;

    this.el.innerHTML = `
      <div class="auth-container">
        <div class="auth-logo">🎓</div>
        <h1>Organizador de Estudos</h1>
        <p>${this.isLoginMode ? 'Entre para sincronizar seus dados' : 'Crie sua conta para começar'}</p>

        ${!isConfigured ? `
          <div class="auth-setup-warning">
            <strong>⚠️ Atenção:</strong> O Supabase não está configurado.<br><br>
            Por favor, abra o arquivo <code>js/utils/supabaseClient.js</code> e insira sua URL e Anon Key para que o login funcione.
          </div>
        ` : ''}

        <div class="auth-form">
          <input type="email" id="auth-email" class="auth-input" placeholder="Seu email" required autocomplete="username">
          <input type="password" id="auth-password" class="auth-input" placeholder="Sua senha" required autocomplete="${this.isLoginMode ? 'current-password' : 'new-password'}">
          
          <div id="auth-error" class="auth-error"></div>

          <button class="auth-btn primary" id="btn-auth-submit" ${!isConfigured ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ${this.isLoginMode ? 'Entrar' : 'Criar Conta'}
          </button>
        </div>

        <div class="auth-toggle">
          ${this.isLoginMode 
            ? 'Não tem uma conta? <a href="#" id="auth-toggle-btn">Cadastre-se</a>' 
            : 'Já tem uma conta? <a href="#" id="auth-toggle-btn">Faça Login</a>'}
        </div>
      </div>
    `;

    this._bindEvents();
    this.show();
  }

  show() {
    this.el.style.display = 'flex';
    // Ocultar os elementos principais do app enquanto estiver na tela de Auth
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
  }

  hide() {
    this.el.style.display = 'none';
    // Mostrar os elementos principais
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (sidebar) sidebar.style.display = '';
    if (mainContent) mainContent.style.display = '';
  }

  _bindEvents() {
    const btnSubmit = document.getElementById('btn-auth-submit');
    const btnToggle = document.getElementById('auth-toggle-btn');
    const errorEl = document.getElementById('auth-error');
    
    if (btnToggle) {
      btnToggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.isLoginMode = !this.isLoginMode;
        this.render();
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value.trim();

        if (!email || !password) {
          errorEl.textContent = 'Preencha email e senha.';
          return;
        }

        errorEl.textContent = '';
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Aguarde...';

        try {
          if (this.isLoginMode) {
            const { data, error } = await window.SupabaseClient.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            EventBus.emit('auth:success', data.user);
          } else {
            const { data, error } = await window.SupabaseClient.auth.signUp({
              email,
              password,
            });
            if (error) throw error;
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                throw new Error('Email já está em uso.');
            }
            alert('Conta criada com sucesso! Faça login.');
            this.isLoginMode = true;
            this.render();
          }
        } catch (e) {
          errorEl.textContent = e.message || 'Erro ao autenticar.';
          btnSubmit.disabled = false;
          btnSubmit.textContent = this.isLoginMode ? 'Entrar' : 'Criar Conta';
        }
      });
    }

    // Permitir submeter com a tecla Enter
    document.getElementById('auth-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        btnSubmit.click();
      }
    });
  }
}
