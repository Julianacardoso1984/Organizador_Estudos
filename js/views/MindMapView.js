'use strict';

/**
 * MindMapView — Editor de mapas mentais e conceituais via Canvas 2D.
 * Interface aprimorada com gradientes, sombras coloridas, zoom indicator,
 * menu de contexto e cursor dinâmico.
 */
class MindMapView {
  constructor() {
    this.el = document.getElementById('view-mindmap');
    this._map = null;
    this._nodes = [];
    this._edges = [];

    // Canvas state
    this._scale = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._selected = null;    // {type:'node'|'edge', id}
    this._dragging = null;    // {nodeId, startX, startY, origX, origY}
    this._connecting = null;  // {fromId}
    this._panning = false;
    this._panStart = null;
    this._connectMode = false;
    this._hoveredNode = null;

    this._canvas = null;
    this._ctx = null;
    this._raf = null;
    this._editInput = null;
    this._contextMenu = null;
    this._zoomIndicator = null;

    this._currentColor = '#8B5CF6';
    this._NODE_COLORS = [
      '#8B5CF6', '#06B6D4', '#10B981',
      '#F59E0B', '#EF4444', '#EC4899', '#3B82F6'
    ];

    // Node gradients cache: rebuilt each frame (done via createLinearGradient)
    this._dpr = window.devicePixelRatio || 1;
  }

  render(map, subject) {
    this._map = map;
    this._nodes = map ? JSON.parse(JSON.stringify(map.nodes)) : [];
    this._edges = map ? JSON.parse(JSON.stringify(map.edges)) : [];

    const accentColor = subject?.color || '#8B5CF6';
    const mapType = map?.type === 'concept' ? 'Conceitual' : 'Mental';

    this.el.innerHTML = `
      <div class="mindmap-wrap">
        <div class="mindmap-toolbar">
          <div class="mindmap-title">
            <span style="font-size:1.1rem">${subject?.emoji || '🧠'}</span>
            <span>${map?.name || 'Mapa Mental'}</span>
            <span class="mindmap-type-badge">${mapType}</span>
          </div>
          <div class="mindmap-tools">

            <!-- Ferramentas de modo -->
            <div class="tool-group">
              <button class="tool-btn active" id="mm-tool-select" title="Selecionar (S)">
                <svg viewBox="0 0 24 24"><path d="M5 3l14 9-7 1-4 7z" stroke-linejoin="round"/></svg>
                <span class="tool-btn-label">Selecionar</span>
              </button>
              <button class="tool-btn" id="mm-tool-connect" title="Conectar nós (C)">
                <svg viewBox="0 0 24 24"><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M15 9l-6 6"/></svg>
                <span class="tool-btn-label">Conectar</span>
              </button>
            </div>

            <div class="tool-separator"></div>

            <!-- Paleta de cores -->
            <div class="color-palette" id="mm-color-palette">
              ${this._NODE_COLORS.map((c, i) =>
                `<button class="color-dot${i === 0 ? ' selected' : ''}" data-color="${c}" style="background:${c}" title="${c}"></button>`
              ).join('')}
            </div>

            <div class="tool-separator"></div>

            <!-- Zoom -->
            <div class="tool-group">
              <button class="tool-btn" id="mm-zoom-out" title="Diminuir zoom (-)">
                <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <span class="mm-zoom-indicator" id="mm-zoom-label">100%</span>
              <button class="tool-btn" id="mm-zoom-in" title="Aumentar zoom (+)">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button class="tool-btn" id="mm-zoom-reset" title="Resetar visualização (0)">
                <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
            </div>

            <div class="tool-separator"></div>

            <!-- Apagar selecionado -->
            <button class="tool-btn danger" id="mm-delete-sel" title="Apagar selecionado (Del)">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>

            <div class="tool-separator"></div>

            <!-- Ações -->
            <button class="mm-action-btn mm-btn-ai" id="mm-ai-generate">
              <svg viewBox="0 0 24 24"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
              NotebookLM
            </button>
            <button class="mm-action-btn mm-btn-export" id="mm-export">
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar PNG
            </button>
            <button class="mm-action-btn mm-btn-delete-map" id="mm-delete-map" title="Apagar mapa permanentemente">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Apagar mapa
            </button>
          </div>
        </div>

        <div class="mindmap-canvas-wrap" id="mm-canvas-wrap">
          <canvas id="mm-canvas"></canvas>
          <input class="mm-node-input hidden" id="mm-node-input" type="text" spellcheck="false">
          ${this._nodes.length === 0 ? `
          <div class="mm-empty-state" id="mm-empty-state">
            <div class="mm-empty-icon">🧠</div>
            <div class="mm-empty-text">Dê um <strong>duplo clique</strong> para criar o primeiro nó<br><span style="font-size:0.78rem">Shift+arraste para conectar · Scroll para zoom</span></div>
          </div>` : ''}
          <div class="mm-hint" id="mm-hint">Duplo clique · Shift+arraste para conectar · Scroll para zoom · Clique direito para opções</div>
        </div>
      </div>`;

    this._initCanvas();
    this._bindCanvasEvents();
    this._bindToolbarEvents();
    this._updateZoomLabel();
  }

  // ── Canvas Init ───────────────────────────────────────────────────────────

  _initCanvas() {
    this._canvas = document.getElementById('mm-canvas');
    this._ctx = this._canvas.getContext('2d');
    this._editInput = document.getElementById('mm-node-input');
    this._zoomIndicator = document.getElementById('mm-zoom-label');

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    const wrap = document.getElementById('mm-canvas-wrap');
    if (!wrap) return;
    const dpr = this._dpr;
    this._canvas.width = wrap.offsetWidth * dpr;
    this._canvas.height = wrap.offsetHeight * dpr;
    this._canvas.style.width = wrap.offsetWidth + 'px';
    this._canvas.style.height = wrap.offsetHeight + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this._draw();
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  _draw() {
    const c = this._canvas, ctx = this._ctx;
    const W = c.width / this._dpr;
    const H = c.height / this._dpr;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    // Edges first (below nodes)
    for (const edge of this._edges) {
      const from = this._nodes.find(n => n.id === edge.from);
      const to   = this._nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;
      this._drawEdge(ctx, from, to, edge);
    }

    // Live connection preview
    if (this._connecting && this._mousePos) {
      const from = this._nodes.find(n => n.id === this._connecting.fromId);
      if (from) {
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = this._currentColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.moveTo(from.x, from.y);
        // Slight curve toward target
        const mx = (from.x + this._mousePos.x) / 2;
        ctx.bezierCurveTo(mx, from.y, mx, this._mousePos.y, this._mousePos.x, this._mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Arrow tip
        const angle = Math.atan2(this._mousePos.y - from.y, this._mousePos.x - from.x);
        this._drawArrowHead(ctx, this._mousePos.x, this._mousePos.y, angle, this._currentColor, 0.7);
      }
    }

    // Nodes
    for (const node of this._nodes) {
      this._drawNode(ctx, node, W, H);
    }

    ctx.restore();

    // Update empty state
    const emptyEl = document.getElementById('mm-empty-state');
    if (emptyEl) {
      emptyEl.style.display = this._nodes.length > 0 ? 'none' : 'flex';
    }
  }

  _drawNode(ctx, node, W, H) {
    const isSelected = this._selected?.type === 'node' && this._selected.id === node.id;
    const isHovered  = this._hoveredNode === node.id;
    const w = node.width  || 130;
    const h = node.height || 44;
    const r = 12;
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const color = node.color || '#8B5CF6';

    ctx.save();

    // Glow / selection shadow
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 20;
    } else if (isHovered) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 8;
    }
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // Main fill: gradient from color to slightly darker
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, this._darkenColor(color, 0.18));

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shine overlay (top highlight)
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const shine = ctx.createLinearGradient(x, y, x, y + h * 0.55);
    shine.addColorStop(0, 'rgba(255,255,255,0.18)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w - 2, h * 0.55, [r, r, 0, 0]);
    ctx.fillStyle = shine;
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, w + 4, h + 4, r + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (isHovered) {
      ctx.beginPath();
      ctx.roundRect(x - 1, y - 1, w + 2, h + 2, r + 1);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `600 12.5px "Inter", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxW = w - 18;
    const text = this._truncate(ctx, node.text || '', maxW);
    ctx.fillText(text, node.x, node.y);

    ctx.restore();
  }

  _drawEdge(ctx, from, to, edge) {
    const isSelected = this._selected?.type === 'edge' && this._selected.id === edge.id;
    const fromColor = from.color || '#8B5CF6';
    const toColor   = to.color   || '#06B6D4';

    ctx.save();

    // Gradient stroke
    const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    grad.addColorStop(0, isSelected ? '#ffffff' : fromColor);
    grad.addColorStop(1, isSelected ? '#ffffff' : toColor);

    ctx.beginPath();
    ctx.strokeStyle = grad;
    ctx.lineWidth = isSelected ? 2.5 : 1.8;
    ctx.globalAlpha = isSelected ? 1 : 0.65;

    // Bezier curve
    const mx = (from.x + to.x) / 2;
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(mx, from.y, mx, to.y, to.x, to.y);
    ctx.stroke();

    ctx.globalAlpha = 1;

    // Arrowhead
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    this._drawArrowHead(ctx, to.x, to.y, angle, isSelected ? '#ffffff' : toColor);

    // Label (concept maps)
    if (edge.label && this._map?.type === 'concept') {
      const lx = (from.x + to.x) / 2;
      const ly = (from.y + to.y) / 2;
      const lw = ctx.measureText(edge.label.slice(0, 14)).width + 16;
      ctx.fillStyle = 'rgba(15,15,20,0.8)';
      ctx.beginPath();
      ctx.roundRect(lx - lw / 2, ly - 11, lw, 22, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '500 10.5px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label.slice(0, 14), lx, ly);
    }

    ctx.restore();
  }

  _drawArrowHead(ctx, x, y, angle, color, alpha = 1) {
    const len = 10;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * Math.cos(angle - 0.38), y - len * Math.sin(angle - 0.38));
    ctx.lineTo(x - len * Math.cos(angle + 0.38), y - len * Math.sin(angle + 0.38));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Color Utilities ───────────────────────────────────────────────────────

  _darkenColor(hex, amount) {
    // Parse hex and darken by `amount` (0–1)
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.round(r * (1 - amount)));
    g = Math.max(0, Math.round(g * (1 - amount)));
    b = Math.max(0, Math.round(b * (1 - amount)));
    return `rgb(${r},${g},${b})`;
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  _bindToolbarEvents() {
    document.getElementById('mm-tool-connect')?.addEventListener('click', () => {
      this._connectMode = !this._connectMode;
      document.getElementById('mm-tool-connect')?.classList.toggle('active', this._connectMode);
      document.getElementById('mm-tool-select')?.classList.toggle('active', !this._connectMode);
      this._canvas.className = this._connectMode ? 'cursor-crosshair' : '';
    });
    document.getElementById('mm-tool-select')?.addEventListener('click', () => {
      this._connectMode = false;
      document.getElementById('mm-tool-select')?.classList.add('active');
      document.getElementById('mm-tool-connect')?.classList.remove('active');
      this._canvas.className = '';
    });

    document.getElementById('mm-zoom-in')?.addEventListener('click', () => {
      this._zoomBy(1.25);
    });
    document.getElementById('mm-zoom-out')?.addEventListener('click', () => {
      this._zoomBy(1 / 1.25);
    });
    document.getElementById('mm-zoom-reset')?.addEventListener('click', () => {
      this._scale = 1; this._offsetX = 0; this._offsetY = 0;
      this._updateZoomLabel();
    });

    document.getElementById('mm-delete-sel')?.addEventListener('click', () => this._deleteSelected());
    document.getElementById('mm-ai-generate')?.addEventListener('click', () => {
      if (this._map) EventBus.emit('ui:openNotebookLMMindMapModal', { map: this._map });
    });
    document.getElementById('mm-delete-map')?.addEventListener('click', () => {
      if (this._map) EventBus.emit('ui:deleteMindMap', { mapId: this._map.id });
    });
    document.getElementById('mm-export')?.addEventListener('click', () => this._exportPNG());

    // Color palette
    this.el.querySelectorAll('.color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentColor = btn.dataset.color;
        // Update selected indicator
        this.el.querySelectorAll('.color-dot').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        // Also apply to selected node
        if (this._selected?.type === 'node') {
          const n = this._nodes.find(n => n.id === this._selected.id);
          if (n) { n.color = btn.dataset.color; this._save(); }
        }
      });
    });
  }

  _zoomBy(factor) {
    const wrap = document.getElementById('mm-canvas-wrap');
    if (!wrap) return;
    const cx = wrap.offsetWidth / 2;
    const cy = wrap.offsetHeight / 2;
    this._offsetX = cx - factor * (cx - this._offsetX);
    this._offsetY = cy - factor * (cy - this._offsetY);
    this._scale = Math.max(0.2, Math.min(4, this._scale * factor));
    this._updateZoomLabel();
  }

  _updateZoomLabel() {
    if (this._zoomIndicator) {
      this._zoomIndicator.textContent = Math.round(this._scale * 100) + '%';
    }
  }

  // ── Context Menu ──────────────────────────────────────────────────────────

  _showContextMenu(e, node) {
    this._closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'mm-context-menu';
    menu.id = 'mm-ctx-menu';

    const items = node ? [
      { label: 'Editar texto', icon: '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', action: () => this._startEdit(node) },
      { label: 'Centralizar nó',  icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>', action: () => this._centerOnNode(node) },
      { sep: true },
      { label: 'Apagar nó', icon: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>', danger: true, action: () => {
        this._selected = { type: 'node', id: node.id };
        this._deleteSelected();
      }},
    ] : [
      { label: 'Criar nó aqui', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>', action: () => {
        const rect = this._canvas.getBoundingClientRect();
        const wx = (e.clientX - rect.left - this._offsetX) / this._scale;
        const wy = (e.clientY - rect.top  - this._offsetY) / this._scale;
        const newNode = { id: _uuid(), x: wx, y: wy, text: 'Novo nó', color: this._currentColor, width: 130, height: 44 };
        this._nodes.push(newNode);
        this._save();
        setTimeout(() => this._startEdit(newNode), 50);
      }},
      { label: 'Centralizar tudo', icon: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v5h5"/></svg>', action: () => { this._scale = 1; this._offsetX = 0; this._offsetY = 0; this._updateZoomLabel(); } },
    ];

    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement('div');
        sep.className = 'mm-ctx-sep';
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement('div');
      el.className = 'mm-context-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `${item.icon}<span>${item.label}</span>`;
      el.addEventListener('click', () => { item.action(); this._closeContextMenu(); });
      menu.appendChild(el);
    });

    const wrap = document.getElementById('mm-canvas-wrap');
    wrap.appendChild(menu);
    this._contextMenu = menu;

    // Position
    const wRect = wrap.getBoundingClientRect();
    let left = e.clientX - wRect.left;
    let top  = e.clientY - wRect.top;
    if (left + 180 > wrap.offsetWidth)  left -= 170;
    if (top  + 120 > wrap.offsetHeight) top  -= menu.offsetHeight + 10;
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
  }

  _closeContextMenu() {
    if (this._contextMenu) {
      this._contextMenu.remove();
      this._contextMenu = null;
    }
  }

  _centerOnNode(node) {
    const wrap = document.getElementById('mm-canvas-wrap');
    if (!wrap) return;
    this._offsetX = wrap.offsetWidth  / 2 - node.x * this._scale;
    this._offsetY = wrap.offsetHeight / 2 - node.y * this._scale;
  }

  // ── Mouse Helpers ─────────────────────────────────────────────────────────

  _toWorld(e) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this._offsetX) / this._scale,
      y: (e.clientY - rect.top  - this._offsetY) / this._scale
    };
  }

  _hitNode(wx, wy) {
    for (let i = this._nodes.length - 1; i >= 0; i--) {
      const n = this._nodes[i];
      const hw = (n.width  || 130) / 2;
      const hh = (n.height || 44)  / 2;
      if (wx >= n.x - hw && wx <= n.x + hw && wy >= n.y - hh && wy <= n.y + hh) return n;
    }
    return null;
  }

  // ── Canvas Events ─────────────────────────────────────────────────────────

  _bindCanvasEvents() {
    const canvas = this._canvas;
    canvas.addEventListener('dblclick',    e => this._onDblClick(e));
    canvas.addEventListener('mousedown',   e => this._onMouseDown(e));
    canvas.addEventListener('mousemove',   e => this._onMouseMove(e));
    canvas.addEventListener('mouseup',     e => this._onMouseUp(e));
    canvas.addEventListener('mouseleave',  () => { this._hoveredNode = null; });
    canvas.addEventListener('contextmenu', e => this._onContextMenu(e));
    canvas.addEventListener('wheel',       e => this._onWheel(e), { passive: false });
    document.addEventListener('keydown',   e => this._onKeyDown(e));
    document.addEventListener('click',     e => {
      if (this._contextMenu && !this._contextMenu.contains(e.target)) {
        this._closeContextMenu();
      }
    });

    this._editInput.addEventListener('blur',    () => this._commitEdit());
    this._editInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); this._commitEdit(); }
      if (e.key === 'Escape') { this._editInput.classList.add('hidden'); }
    });
  }

  _onContextMenu(e) {
    e.preventDefault();
    const { x, y } = this._toWorld(e);
    const hit = this._hitNode(x, y);
    if (hit) this._selected = { type: 'node', id: hit.id };
    this._showContextMenu(e, hit);
  }

  _onDblClick(e) {
    this._closeContextMenu();
    const { x, y } = this._toWorld(e);
    const hit = this._hitNode(x, y);
    if (hit) { this._startEdit(hit); return; }
    const node = {
      id: _uuid(), x, y,
      text: 'Novo nó',
      color: this._currentColor,
      width: 130,
      height: 44
    };
    this._nodes.push(node);
    this._save();
    setTimeout(() => this._startEdit(node), 50);
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this._closeContextMenu();
    const { x, y } = this._toWorld(e);
    this._mousePos = { x, y };
    const hit = this._hitNode(x, y);

    if (hit && (e.shiftKey || this._connectMode)) {
      this._connecting = { fromId: hit.id };
      return;
    }
    if (hit) {
      this._selected = { type: 'node', id: hit.id };
      this._dragging = { nodeId: hit.id, startX: e.clientX, startY: e.clientY, origX: hit.x, origY: hit.y };
      this._canvas.classList.add('cursor-grabbing');
      return;
    }
    // Pan
    this._panning = true;
    this._panStart = { x: e.clientX - this._offsetX, y: e.clientY - this._offsetY };
    this._selected = null;
    this._canvas.classList.add('cursor-grabbing');
  }

  _onMouseMove(e) {
    const { x, y } = this._toWorld(e);
    this._mousePos = { x, y };

    if (this._dragging) {
      const n = this._nodes.find(n => n.id === this._dragging.nodeId);
      if (n) {
        n.x = this._dragging.origX + (e.clientX - this._dragging.startX) / this._scale;
        n.y = this._dragging.origY + (e.clientY - this._dragging.startY) / this._scale;
      }
      return;
    }
    if (this._panning) {
      this._offsetX = e.clientX - this._panStart.x;
      this._offsetY = e.clientY - this._panStart.y;
      return;
    }

    // Hover detection
    const hit = this._hitNode(x, y);
    this._hoveredNode = hit ? hit.id : null;
    if (!this._connectMode) {
      this._canvas.style.cursor = hit ? 'pointer' : 'default';
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;
    this._canvas.classList.remove('cursor-grabbing');

    if (this._connecting) {
      const { x, y } = this._toWorld(e);
      const hit = this._hitNode(x, y);
      if (hit && hit.id !== this._connecting.fromId) {
        // Avoid duplicate edges
        const exists = this._edges.find(
          ed => (ed.from === this._connecting.fromId && ed.to === hit.id) ||
                (ed.from === hit.id && ed.to === this._connecting.fromId)
        );
        if (!exists) {
          const label = this._map?.type === 'concept'
            ? (prompt('Rótulo da conexão (opcional):') || '') : '';
          this._edges.push({ id: _uuid(), from: this._connecting.fromId, to: hit.id, label });
          this._save();
        }
      }
      this._connecting = null;
    }
    if (this._dragging) { this._save(); this._dragging = null; }
    this._panning = false;
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this._canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this._offsetX = mx - factor * (mx - this._offsetX);
    this._offsetY = my - factor * (my - this._offsetY);
    this._scale = Math.max(0.2, Math.min(4, this._scale * factor));
    this._updateZoomLabel();
  }

  _onKeyDown(e) {
    if (this.el.classList.contains('hidden')) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    if ((e.key === 'Delete' || e.key === 'Backspace') && this._selected) {
      this._deleteSelected();
    }
    if (e.key === 's' || e.key === 'S') {
      this._connectMode = false;
      document.getElementById('mm-tool-select')?.classList.add('active');
      document.getElementById('mm-tool-connect')?.classList.remove('active');
      this._canvas.style.cursor = 'default';
    }
    if (e.key === 'c' || e.key === 'C') {
      this._connectMode = true;
      document.getElementById('mm-tool-connect')?.classList.add('active');
      document.getElementById('mm-tool-select')?.classList.remove('active');
      this._canvas.style.cursor = 'crosshair';
    }
    if (e.key === '0') {
      this._scale = 1; this._offsetX = 0; this._offsetY = 0;
      this._updateZoomLabel();
    }
    if (e.key === '+' || e.key === '=') this._zoomBy(1.2);
    if (e.key === '-') this._zoomBy(1 / 1.2);
    if (e.key === 'Escape') { this._selected = null; this._connecting = null; this._closeContextMenu(); }
  }

  // ── Node Edit ─────────────────────────────────────────────────────────────

  _deleteSelected() {
    if (!this._selected) return;
    if (this._selected.type === 'node') {
      this._nodes = this._nodes.filter(n => n.id !== this._selected.id);
      this._edges = this._edges.filter(e => e.from !== this._selected.id && e.to !== this._selected.id);
    } else {
      this._edges = this._edges.filter(e => e.id !== this._selected.id);
    }
    this._selected = null;
    this._save();
  }

  _startEdit(node) {
    const input = this._editInput;
    const w = node.width || 130;
    const sx = node.x * this._scale + this._offsetX;
    const sy = node.y * this._scale + this._offsetY;
    input.value = node.text;
    input.style.left   = (sx - w / 2) + 'px';
    input.style.top    = (sy - 16) + 'px';
    input.style.width  = (w - 4) + 'px';
    input.dataset.nodeId = node.id;
    input.classList.remove('hidden');
    input.focus();
    input.select();
  }

  _commitEdit() {
    const input = this._editInput;
    const nodeId = input.dataset.nodeId;
    if (!nodeId) return;
    const n = this._nodes.find(n => n.id === nodeId);
    if (n) {
      n.text = input.value.trim() || 'Nó';
      this._save();
    }
    input.classList.add('hidden');
    delete input.dataset.nodeId;
  }

  // ── Export ────────────────────────────────────────────────────────────────

  _exportPNG() {
    if (this._nodes.length === 0) return;
    const tempCanvas = document.createElement('canvas');
    const pad = 48;
    const xs  = this._nodes.map(n => n.x - (n.width  || 130) / 2);
    const xe  = this._nodes.map(n => n.x + (n.width  || 130) / 2);
    const ys  = this._nodes.map(n => n.y - (n.height || 44)  / 2);
    const ye  = this._nodes.map(n => n.y + (n.height || 44)  / 2);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xe) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ye) + pad;
    const W = maxX - minX, H = maxY - minY;
    const scale = 2;
    tempCanvas.width  = W * scale;
    tempCanvas.height = H * scale;
    const tctx = tempCanvas.getContext('2d');
    tctx.scale(scale, scale);
    tctx.translate(-minX, -minY);

    const isDark = !document.body.classList.contains('light');
    tctx.fillStyle = isDark ? '#111113' : '#F9FAFB';
    tctx.fillRect(minX, minY, W, H);

    // Dot grid
    tctx.fillStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const gs = 24;
    for (let gx = minX; gx < maxX; gx += gs) {
      for (let gy = minY; gy < maxY; gy += gs) {
        tctx.beginPath();
        tctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        tctx.fill();
      }
    }

    for (const e of this._edges) {
      const f = this._nodes.find(n => n.id === e.from);
      const t = this._nodes.find(n => n.id === e.to);
      if (f && t) this._drawEdge(tctx, f, t, e);
    }
    for (const n of this._nodes) this._drawNode(tctx, n);

    const link = document.createElement('a');
    link.download = `${this._map?.name || 'mapa'}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  _save() {
    if (!this._map) return;
    EventBus.emit('mindmap:save', { mapId: this._map.id, nodes: this._nodes, edges: this._edges });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 0 && ctx.measureText(text + '…').width > maxW) {
      text = text.slice(0, -1);
    }
    return text + '…';
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._closeContextMenu();
  }
}
