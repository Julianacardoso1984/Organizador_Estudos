'use strict';

/**
 * PlatformBrowserView — Exibe um navegador web embutido (iframe) dentro da aplicação.
 */
class PlatformBrowserView {
  constructor() {
    this.el = document.getElementById('view-platform-browser');
  }

  render(name, url) {
    this.el.innerHTML = `
      <div class="platform-browser-wrap">
        <div class="platform-browser-toolbar">
          <button class="btn-ghost btn-sm" id="btn-browser-back">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.5; transform:rotate(180deg); margin-right:4px;"><polyline points="9 18 15 12 9 6"/></svg>
            Voltar
          </button>
          <div class="platform-browser-title">
            <span class="browser-globe-icon">🌐</span>
            Plataforma: <strong>${name}</strong>
          </div>
          <a href="${url}" target="_blank" class="btn-primary btn-sm" style="text-decoration:none;">
            Abrir em nova aba ↗
          </a>
        </div>
        <div class="platform-browser-container">
          <iframe src="${url}" class="platform-browser-iframe" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"></iframe>
        </div>
      </div>
    `;

    document.getElementById('btn-browser-back')?.addEventListener('click', () => {
      EventBus.emit('navigate', { view: 'dashboard' });
    });
  }
}
