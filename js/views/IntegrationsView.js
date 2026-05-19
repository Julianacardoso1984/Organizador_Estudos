'use strict';

/**
 * IntegrationsView — Gerencia a interface de configuração de conexões externas.
 */
class IntegrationsView {
  constructor() {
    this.el = document.getElementById('view-integrations');
  }

  render() {
    const isGoogleConnected = window.GoogleCalendar?.isAuthenticated();
    const googleClientId = window.GoogleCalendar?.getClientId() || '';

    const dcConfig = window.Discord?.config || {};
    const dcConnected = !!dcConfig.webhookUrl;

    this.el.innerHTML = `
      <div class="view-content integrations-content">
        <div class="view-header">
          <h1>🔌 Integrações externas</h1>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Conecte seus aplicativos externos para automatizar seus estudos.</p>
        </div>

        <div class="integrations-grid">
          <!-- Card Google -->
          <div class="integration-card">
            <div class="integration-card-header">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill: currentColor; margin-bottom:-2px;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.386-2.875-6.386-6.385s2.875-6.386 6.386-6.386c1.582 0 3.06.586 4.186 1.648l3.078-3.078C19.294 2.41 16.002 1 12.24 1 6.043 1 1 6.043 1 12.24s5.043 11.24 11.24 11.24c6.45 0 11.143-4.516 11.143-11.24 0-.766-.082-1.354-.22-1.955H12.24z"/></svg>
                Google Suite (Calendar / Docs)
              </h2>
              <span class="integration-badge ${isGoogleConnected ? 'connected' : 'disconnected'}">
                ${isGoogleConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            
            <div class="integration-form">
              <div class="integration-field">
                <label for="google-client-id-input">Google Client ID</label>
                <input type="text" id="google-client-id-input" value="${googleClientId}" placeholder="Cole seu Client ID do Google Cloud Console">
              </div>
              <div style="display:flex; gap:10px; margin-top: 10px;">
                <button class="btn-primary" id="btn-save-google-settings" style="flex:1;">Salvar Client ID</button>
                ${isGoogleConnected 
                  ? `<button class="btn-ghost" id="btn-disconnect-google" style="color:#EF4444;">Desconectar</button>` 
                  : `<button class="btn-ghost" id="btn-connect-google">Conectar Conta</button>`
                }
              </div>
            </div>
          </div>

          <!-- Card Discord -->
          <div class="integration-card">
            <div class="integration-card-header">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill: currentColor; margin-bottom:-2px;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
                Discord Webhook Bot
              </h2>
              <span class="integration-badge ${dcConnected ? 'connected' : 'disconnected'}">
                ${dcConnected ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div class="integration-form">
              <div class="integration-field">
                <label for="discord-webhook-url-input">URL da Webhook do Discord</label>
                <input type="password" id="discord-webhook-url-input" value="${dcConfig.webhookUrl || ''}" placeholder="https://discord.com/api/webhooks/...">
              </div>
              <div class="integration-field">
                <label for="discord-username-input">Apelido do Bot (Nome de Exibição)</label>
                <input type="text" id="discord-username-input" value="${dcConfig.username || 'EstudaAí Bot'}" placeholder="Nome que aparecerá no Discord">
              </div>

              <div class="integration-toggles-title">Notificar quando:</div>
              <div class="integration-toggles">
                <div class="integration-toggle-item">
                  <div class="integration-toggle-info">
                    <span class="integration-toggle-label">⏱️ Pomodoro concluído</span>
                    <span class="integration-toggle-desc">Avisar no canal ao fim de cada ciclo de foco.</span>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="discord-notify-pomodoro" ${dcConfig.notifyPomodoro ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="integration-toggle-item">
                  <div class="integration-toggle-info">
                    <span class="integration-toggle-label">✅ Tarefas cumpridas</span>
                    <span class="integration-toggle-desc">Avisar no canal ao marcar uma tarefa como feita.</span>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="discord-notify-task" ${dcConfig.notifyTask ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="integration-toggle-item">
                  <div class="integration-toggle-info">
                    <span class="integration-toggle-label">📄 Resumos e Anotações</span>
                    <span class="integration-toggle-desc">Avisar no canal ao criar novos resumos de matérias.</span>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="discord-notify-notes" ${dcConfig.notifyNotes ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>

                <div class="integration-toggle-item">
                  <div class="integration-toggle-info">
                    <span class="integration-toggle-label">🧠 Mapas Mentais</span>
                    <span class="integration-toggle-desc">Avisar no canal ao criar novos mapas conceituais.</span>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="discord-notify-mindmap" ${dcConfig.notifyMindMap ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <div style="display:flex; gap:10px; margin-top:10px;">
                <button class="btn-primary" id="btn-save-discord-settings" style="flex:1;">Salvar Configurações</button>
                <button class="btn-ghost" id="btn-test-discord" ${!dcConnected ? 'disabled' : ''}>Testar Envio</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    // Save Google settings
    document.getElementById('btn-save-google-settings')?.addEventListener('click', () => {
      const clientId = document.getElementById('google-client-id-input').value.trim();
      if (!clientId) {
        alert('Por favor, digite um Client ID válido.');
        return;
      }
      EventBus.emit('ui:changeGCalClientId', { clientId });
    });

    // Connect/Disconnect Google
    document.getElementById('btn-connect-google')?.addEventListener('click', () => {
      EventBus.emit('ui:connectGoogleCalendar');
    });

    document.getElementById('btn-disconnect-google')?.addEventListener('click', () => {
      if (confirm('Deseja desconectar sua conta do Google?')) {
        EventBus.emit('ui:disconnectGoogleCalendar');
      }
    });

    // Save Discord Settings
    document.getElementById('btn-save-discord-settings')?.addEventListener('click', () => {
      const webhookUrl = document.getElementById('discord-webhook-url-input').value.trim();
      const username = document.getElementById('discord-username-input').value.trim() || 'EstudaAí Bot';
      
      const notifyPomodoro = document.getElementById('discord-notify-pomodoro').checked;
      const notifyTask = document.getElementById('discord-notify-task').checked;
      const notifyNotes = document.getElementById('discord-notify-notes').checked;
      const notifyMindMap = document.getElementById('discord-notify-mindmap').checked;

      EventBus.emit('ui:saveDiscordConfig', {
        webhookUrl,
        username,
        notifyPomodoro,
        notifyTask,
        notifyNotes,
        notifyMindMap
      });
    });

    // Test Discord Webhook
    document.getElementById('btn-test-discord')?.addEventListener('click', () => {
      EventBus.emit('ui:testDiscordWebhook');
    });
  }
}
