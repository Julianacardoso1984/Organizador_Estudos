'use strict';

/**
 * IntegrationsView — Gerencia a interface de configuração de conexões externas.
 */
class IntegrationsView {
  constructor() {
    this.el = document.getElementById('view-integrations');
  }

  render(spotifyPlaylists = null) {
    const isGoogleConnected = window.GoogleCalendar?.isAuthenticated();
    const googleClientId = window.GoogleCalendar?.getClientId() || '';

    const dcConfig = window.Discord?.config || {};
    const dcConnected = !!dcConfig.webhookUrl;

    const sp = window.Spotify;
    const spConnected = sp?.isAuthenticated();
    const spUser = sp?.getUser();
    const spClientId = sp?.getClientId() || '';
    const spSelected = sp?.getSelectedPlaylist() || {};
    const spSvg = `<svg viewBox="0 0 24 24" width="20" height="20" style="fill:#1DB954;margin-bottom:-2px;"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.438-5.305-1.764-8.788-.97-.336.075-.668-.135-.744-.47-.077-.336.135-.668.47-.743 3.818-.874 7.08-.503 9.714 1.11.294.18.385.563.205.857zm1.225-2.72c-.227.367-.707.487-1.074.26-2.69-1.654-6.79-2.134-9.967-1.17-.413.125-.85-.107-.975-.52-.125-.413.107-.85.52-.975 3.637-1.104 8.148-.567 11.236 1.33.367.226.487.707.26 1.075zm.106-2.837C14.502 8.84 8.703 8.65 5.342 9.67c-.522.158-1.076-.14-1.234-.662-.158-.522.14-1.076.662-1.234 3.856-1.17 10.25-.953 14.218 1.403.47.28.624.893.345 1.364-.28.47-.893.623-1.364.344z"/></svg>`;

    // Build playlist list HTML
    let playlistsHtml = '';
    if (spConnected && spotifyPlaylists) {
      if (spotifyPlaylists.length === 0) {
        playlistsHtml = `<p style="color:var(--text-muted);font-size:0.82rem;">Nenhuma playlist encontrada.</p>`;
      } else {
        playlistsHtml = `
          <div style="margin-top:12px;">
            <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:8px;">Selecione uma playlist para tocar no Pomodoro:</p>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;padding-right:4px;">
              ${spotifyPlaylists.map(pl => {
                const isSelected = spSelected.selectedPlaylistId === pl.id;
                const img = pl.images?.[0]?.url || '';
                return `<button class="btn-playlist-item ${isSelected ? 'selected' : ''}" data-playlist-id="${pl.id}" data-playlist-name="${pl.name.replace(/"/g,'')}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:${isSelected ? 'rgba(29,185,84,0.15)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isSelected ? '#1DB954' : 'rgba(255,255,255,0.07)'};border-radius:8px;cursor:pointer;text-align:left;width:100%;">
                  ${img ? `<img src="${img}" style="width:36px;height:36px;border-radius:4px;object-fit:cover;" />` : `<div style="width:36px;height:36px;border-radius:4px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">🎵</div>`}
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:0.85rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.name}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted);">${pl.tracks?.total ?? 0} músicas</div>
                  </div>
                  ${isSelected ? `<span style="color:#1DB954;font-size:1rem;">✓</span>` : ''}
                </button>`;
              }).join('')}
            </div>
          </div>`;
      }
    } else if (spConnected && !spotifyPlaylists) {
      playlistsHtml = `<button class="btn-ghost" id="btn-load-spotify-playlists" style="width:100%;margin-top:10px;">🎵 Ver Minhas Playlists</button>`;
    }

    this.el.innerHTML = `
      <div class="view-content integrations-content">
        <div class="view-header">
          <h1>🔌 Integrações externas</h1>
          <p style="color:var(--text-muted);font-size:0.9rem;margin-top:4px;">Conecte seus aplicativos externos para automatizar seus estudos.</p>
        </div>

        <div class="integrations-grid">
          <!-- Card Google -->
          <div class="integration-card">
            <div class="integration-card-header">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;margin-bottom:-2px;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.386-2.875-6.386-6.385s2.875-6.386 6.386-6.386c1.582 0 3.06.586 4.186 1.648l3.078-3.078C19.294 2.41 16.002 1 12.24 1 6.043 1 1 6.043 1 12.24s5.043 11.24 11.24 11.24c6.45 0 11.143-4.516 11.143-11.24 0-.766-.082-1.354-.22-1.955H12.24z"/></svg>
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
              <div style="display:flex;gap:10px;margin-top:10px;">
                <button class="btn-primary" id="btn-save-google-settings" style="flex:1;">Salvar Client ID</button>
                ${isGoogleConnected
                  ? `<button class="btn-ghost" id="btn-disconnect-google" style="color:#EF4444;">Desconectar</button>`
                  : `<button class="btn-ghost" id="btn-connect-google">Conectar Conta</button>`}
              </div>
            </div>
          </div>

          <!-- Card Discord -->
          <div class="integration-card">
            <div class="integration-card-header">
              <h2>
                <svg viewBox="0 0 24 24" width="20" height="20" style="fill:currentColor;margin-bottom:-2px;"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.094 13.094 0 0 1-1.873-.894.077.077 0 0 1-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .078.009c.12.099.246.195.373.289a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/></svg>
                Discord Webhook Bot
              </h2>
              <span class="integration-badge ${dcConnected ? 'connected' : 'disconnected'}">${dcConnected ? 'Ativo' : 'Inativo'}</span>
            </div>
            <div class="integration-form">
              <div class="integration-field">
                <label for="discord-webhook-url-input">URL da Webhook</label>
                <input type="text" id="discord-webhook-url-input" value="${dcConfig.webhookUrl || ''}" placeholder="https://discord.com/api/webhooks/...">
              </div>
              <div class="integration-field">
                <label for="discord-username-input">Nome do Bot</label>
                <input type="text" id="discord-username-input" value="${dcConfig.username || 'EstudaAí Bot'}" placeholder="EstudaAí Bot">
              </div>
              <div class="integration-toggles-title">Notificar quando:</div>
              <div class="integration-toggles">
                <label class="toggle-item"><input type="checkbox" id="discord-notify-pomodoro" ${dcConfig.notifyPomodoro ? 'checked' : ''}> ⏱️ Pomodoro concluído</label>
                <label class="toggle-item"><input type="checkbox" id="discord-notify-task" ${dcConfig.notifyTask ? 'checked' : ''}> ✅ Tarefa concluída</label>
                <label class="toggle-item"><input type="checkbox" id="discord-notify-notes" ${dcConfig.notifyNotes ? 'checked' : ''}> 📝 Nota criada</label>
                <label class="toggle-item"><input type="checkbox" id="discord-notify-mindmap" ${dcConfig.notifyMindMap ? 'checked' : ''}> 🧠 Mapa mental criado</label>
              </div>
              <div class="integration-toggles-title" style="margin-top:20px;">💬 Chat do Discord Embutido</div>
              <div class="integration-field">
                <label for="discord-chat-server-input">Server ID</label>
                <input type="text" id="discord-chat-server-input" value="${dcConfig.chatServerId || ''}" placeholder="Ex: 823485720938472390">
              </div>
              <div class="integration-field">
                <label for="discord-chat-channel-input">Channel ID</label>
                <input type="text" id="discord-chat-channel-input" value="${dcConfig.chatChannelId || ''}" placeholder="Ex: 823485720938472394">
              </div>
              <div style="display:flex;gap:10px;margin-top:10px;">
                <button class="btn-primary" id="btn-save-discord-settings" style="flex:1;">Salvar Configurações</button>
                <button class="btn-ghost" id="btn-test-discord" ${!dcConnected ? 'disabled' : ''}>Testar Envio</button>
              </div>
            </div>
          </div>

          <!-- Card Spotify -->
          <div class="integration-card">
            <div class="integration-card-header">
              <h2>${spSvg} Spotify Player</h2>
              <span class="integration-badge ${spConnected ? 'connected' : 'disconnected'}">
                ${spConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>
            <div class="integration-form">
              ${spConnected ? `
                <div style="display:flex;align-items:center;gap:12px;padding:10px;background:rgba(29,185,84,0.08);border:1px solid rgba(29,185,84,0.25);border-radius:8px;margin-bottom:12px;">
                  ${spUser?.images?.[0]?.url ? `<img src="${spUser.images[0].url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : `<div style="width:40px;height:40px;border-radius:50%;background:#1DB954;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🎵</div>`}
                  <div>
                    <div style="font-weight:600;font-size:0.9rem;color:var(--text);">${spUser?.display_name || 'Usuário Spotify'}</div>
                    <div style="font-size:0.75rem;color:#1DB954;">✓ Conta conectada</div>
                  </div>
                </div>
                ${spSelected.selectedPlaylistName ? `<div style="padding:8px 12px;background:rgba(29,185,84,0.08);border:1px solid rgba(29,185,84,0.2);border-radius:8px;font-size:0.82rem;color:var(--text);margin-bottom:10px;">🎵 Tocando: <strong>${spSelected.selectedPlaylistName}</strong></div>` : ''}
                ${playlistsHtml}
                <button class="btn-ghost" id="btn-logout-spotify" style="color:#EF4444;margin-top:12px;width:100%;">Desconectar Spotify</button>
              ` : `
                <div class="integration-field">
                  <label for="spotify-client-id-input">Spotify Client ID</label>
                  <input type="text" id="spotify-client-id-input" value="${spClientId}" placeholder="Cole seu Client ID do Spotify Dashboard">
                </div>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;font-size:0.78rem;line-height:1.5;color:var(--text-muted);margin-top:4px;">
                  <strong style="color:var(--text);display:block;margin-bottom:4px;">📌 Como obter o Client ID:</strong>
                  1. Acesse <a href="https://developer.spotify.com/dashboard" target="_blank" style="color:#1DB954;">developer.spotify.com/dashboard</a><br>
                  2. Clique em <strong>Create App</strong> e preencha o nome.<br>
                  3. Em <strong>Redirect URIs</strong>, adicione: <code style="background:rgba(255,255,255,0.07);padding:1px 5px;border-radius:3px;">${window.location.origin + '/'}</code><br>
                  4. Copie o <strong>Client ID</strong> e cole acima.
                </div>
                <button class="btn-primary" id="btn-login-spotify" style="width:100%;margin-top:12px;background:#1DB954;border-color:#1DB954;">
                  ${spSvg} Conectar com Spotify
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    this._bindEvents(spotifyPlaylists);
  }

  _bindEvents(spotifyPlaylists = null) {
    // Google
    document.getElementById('btn-save-google-settings')?.addEventListener('click', () => {
      const clientId = document.getElementById('google-client-id-input').value.trim();
      if (!clientId) { alert('Por favor, digite um Client ID válido.'); return; }
      EventBus.emit('ui:changeGCalClientId', { clientId });
    });
    document.getElementById('btn-connect-google')?.addEventListener('click', () => EventBus.emit('ui:connectGoogleCalendar'));
    document.getElementById('btn-disconnect-google')?.addEventListener('click', () => {
      if (confirm('Deseja desconectar sua conta do Google?')) EventBus.emit('ui:disconnectGoogleCalendar');
    });

    // Discord
    document.getElementById('btn-save-discord-settings')?.addEventListener('click', () => {
      EventBus.emit('ui:saveDiscordConfig', {
        webhookUrl: document.getElementById('discord-webhook-url-input').value.trim(),
        username: document.getElementById('discord-username-input').value.trim() || 'EstudaAí Bot',
        notifyPomodoro: document.getElementById('discord-notify-pomodoro').checked,
        notifyTask: document.getElementById('discord-notify-task').checked,
        notifyNotes: document.getElementById('discord-notify-notes').checked,
        notifyMindMap: document.getElementById('discord-notify-mindmap').checked,
        chatServerId: document.getElementById('discord-chat-server-input').value.trim(),
        chatChannelId: document.getElementById('discord-chat-channel-input').value.trim()
      });
    });
    document.getElementById('btn-test-discord')?.addEventListener('click', () => EventBus.emit('ui:testDiscordWebhook'));

    // Spotify Login
    document.getElementById('btn-login-spotify')?.addEventListener('click', () => {
      const clientId = document.getElementById('spotify-client-id-input').value.trim();
      if (!clientId) { alert('Cole o Client ID do Spotify antes de conectar.'); return; }
      EventBus.emit('ui:spotifyLogin', { clientId });
    });
    document.getElementById('btn-logout-spotify')?.addEventListener('click', () => EventBus.emit('ui:spotifyLogout'));
    document.getElementById('btn-load-spotify-playlists')?.addEventListener('click', () => EventBus.emit('ui:loadSpotifyPlaylists'));

    // Playlist selection
    this.el.querySelectorAll('.btn-playlist-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.playlistId;
        const name = btn.dataset.playlistName;
        EventBus.emit('ui:selectSpotifyPlaylist', { id, name });
      });
    });
  }
}


