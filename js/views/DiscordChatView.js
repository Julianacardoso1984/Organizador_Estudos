'use strict';

/**
 * DiscordChatView — Renderiza o chat do Discord integrado (via WidgetBot iframe).
 */
class DiscordChatView {
  constructor() {
    this.el = document.getElementById('view-discord-chat');
  }

  render() {
    const dcConfig = window.Discord?.config || {};
    const serverId = dcConfig.chatServerId;
    const channelId = dcConfig.chatChannelId;

    if (serverId && channelId) {
      this.el.innerHTML = `
        <div class="view-content discord-chat-content" style="height: 100%; display: flex; flex-direction: column; gap: 16px;">
          <div class="view-header" style="margin-bottom:0;">
            <h1>💬 Chat do Discord</h1>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Converse diretamente com seus grupos de estudo sem sair do app.</p>
          </div>
          <div style="flex-grow: 1; min-height: 550px; position: relative;">
            <iframe 
              src="https://e.widgetbot.io/channels/${serverId}/${channelId}?api=true" 
              width="100%" 
              height="100%" 
              style="border: none; border-radius: 12px; width: 100%; height: calc(100vh - 190px); min-height: 550px; background: rgba(0,0,0,0.15);"
              allow="clipboard-write">
            </iframe>
          </div>
        </div>
      `;
    } else {
      this.el.innerHTML = `
        <div class="view-content discord-chat-content" style="height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; padding: 40px;">
          <div class="card" style="max-width: 480px; padding: 40px 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
            <div style="font-size: 4rem;">💬</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--text);">Chat do Discord</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin: 0;">
              Você pode incorporar um canal de chat do seu servidor do Discord diretamente nesta aba para interagir com seus colegas de estudo de forma integrada.
            </p>
            <button class="btn-primary" id="btn-go-to-integrations" style="width: 100%; margin-top: 10px; padding: 12px;">
              Configurar Chat do Discord
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-go-to-integrations')?.addEventListener('click', () => {
        EventBus.emit('navigate', { view: 'integrations' });
      });
    }
  }
}
