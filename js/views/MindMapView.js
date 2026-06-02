'use strict';

/**
 * MindMapView — Visual estilo MindMeister.
 *
 * Características visuais:
 *  - Nó Raiz (sem arestas entrando): retângulo grande com gradiente
 *  - Nó Galho (depth 1): pill arredondado, cor sólida
 *  - Nó Folha (depth 2+): texto com sublinhado colorido (sem caixa)
 *  - Conexões bezier edge-to-edge, coloridas por galho
 *  - Botão "+" flutuante no canvas para adicionar filho ao nó selecionado
 *  - Zoom flutuante no canto inferior direito
 */
class MindMapView {
  constructor() {
    this.el = document.getElementById('view-mindmap');

    this._map    = null;
    this._nodes  = [];
    this._edges  = [];

    // Canvas state
    this._scale    = 1;
    this._offsetX  = 0;
    this._offsetY  = 0;
    this._dpr      = window.devicePixelRatio || 1;

    this._selected    = null;   // {type:'node'|'edge', id}
    this._dragging    = null;   // {nodeId, startX, startY, origX, origY}
    this._connecting  = null;   // {fromId}
    this._hoveredNode = null;
    this._hoveredAdd  = false;  // hovering the "+" add-child button
    this._panning     = false;
    this._panStart    = null;
    this._connectMode = false;

    this._canvas      = null;
    this._ctx         = null;
    this._raf         = null;
    this._editInput   = null;
    this._contextMenu = null;
    this._zoomLabel   = null;

    this._currentColor = '#8B5CF6';
    this._COLORS = [
      '#8B5CF6', '#06B6D4', '#10B981',
      '#F59E0B', '#EF4444', '#EC4899',
      '#3B82F6', '#F97316', '#14B8A6',
    ];

    // Per-frame node metadata (depth, branchColor, dimensions)
    this._nodeMeta = new Map(); // nodeId → {depth, branchColor, w, h}

    // Position of the "+" add button (world coordinates)
    this._addBtn = null; // {x, y, r, parentId}
  }

  // ── Render ────────────────────────────────────────────────────────────────

  render(map, subject) {
    this._map   = map;
    this._nodes = map ? JSON.parse(JSON.stringify(map.nodes)) : [];
    this._edges = map ? JSON.parse(JSON.stringify(map.edges)) : [];

    const mapType = map?.type === 'concept' ? 'Conceitual' : 'Mental';
    const emoji   = subject?.emoji || '🧠';
    const name    = map?.name || 'Mapa Mental';

    this.el.innerHTML = `
<div class="mindmap-wrap">

  <!-- Toolbar -->
  <div class="mindmap-toolbar">
    <div class="mindmap-title">
      <span class="mindmap-title-emoji">${emoji}</span>
      <span class="mindmap-title-text">${name}</span>
      <span class="mindmap-type-badge">${mapType}</span>
    </div>

    <div class="mindmap-tools">

      <!-- Modo -->
      <div class="mm-tool-group">
        <button class="mm-tool-btn active" id="mm-sel" title="Selecionar  (S)">
          <svg viewBox="0 0 24 24"><path d="M5 3l14 9-7 1-4 7z"/></svg>
          Selecionar
        </button>
        <button class="mm-tool-btn" id="mm-con" title="Conectar nós  (C)">
          <svg viewBox="0 0 24 24"><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          Conectar
        </button>
      </div>

      <!-- Paleta -->
      <div class="mm-color-palette" id="mm-palette">
        ${this._COLORS.map((c, i) =>
          `<button class="mm-color-dot${i===0?' active':''}" data-color="${c}"
            style="background:${c}" title="${c}"></button>`
        ).join('')}
      </div>

      <div class="mm-sep"></div>

      <!-- Deletar -->
      <button class="mm-tool-btn danger" id="mm-del-sel" title="Apagar selecionado  (Del)">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>

      <div class="mm-sep"></div>

      <!-- Ações -->
      <button class="mm-action-btn mm-btn-ai" id="mm-ai">
        <svg viewBox="0 0 24 24"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>
        NotebookLM
      </button>
      <button class="mm-action-btn mm-btn-export" id="mm-export">
        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar
      </button>
      <button class="mm-action-btn mm-btn-delete" id="mm-del-map" title="Apagar mapa">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        Apagar mapa
      </button>
    </div>
  </div>

  <!-- Canvas -->
  <div class="mindmap-canvas-wrap" id="mm-wrap">
    <canvas id="mm-canvas"></canvas>
    <input class="mm-node-input hidden" id="mm-input" type="text" spellcheck="false">

    <!-- Empty state -->
    <div class="mm-empty" id="mm-empty">
      <div class="mm-empty-icon">🧠</div>
      <div class="mm-empty-title">Seu mapa está em branco</div>
      <div class="mm-empty-sub">
        <kbd>Duplo clique</kbd> para criar o primeiro nó<br>
        ou selecione um nó e clique no <strong>+</strong> para adicionar filhos
      </div>
    </div>

    <!-- Floating zoom -->
    <div class="mm-zoom-float">
      <button class="mm-zoom-btn" id="mm-zout" title="Zoom −">−</button>
      <span class="mm-zoom-label" id="mm-zlabel">100%</span>
      <button class="mm-zoom-btn" id="mm-zin"  title="Zoom +">+</button>
      <button class="mm-zoom-btn" id="mm-zrst" title="Resetar" style="font-size:0.85rem">⟳</button>
    </div>

    <!-- Hint -->
    <div class="mm-hint">Duplo clique · Shift+arrastar para conectar · Scroll = zoom · Clique direito = opções</div>
  </div>
</div>`;

    this._initCanvas();
    this._bindCanvas();
    this._bindToolbar();
    this._syncEmpty();
    this._updateZoomLabel();
  }

  // ── Canvas Init ───────────────────────────────────────────────────────────

  _initCanvas() {
    this._canvas    = document.getElementById('mm-canvas');
    this._ctx       = this._canvas.getContext('2d');
    this._editInput = document.getElementById('mm-input');
    this._zoomLabel = document.getElementById('mm-zlabel');

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    const wrap = document.getElementById('mm-wrap');
    if (!wrap) return;
    const dpr = this._dpr;
    const W = wrap.offsetWidth;
    const H = wrap.offsetHeight;
    this._canvas.width  = W * dpr;
    this._canvas.height = H * dpr;
    this._canvas.style.width  = W + 'px';
    this._canvas.style.height = H + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this._draw();
  }

  // ── Graph Metadata ────────────────────────────────────────────────────────

  /**
   * Computes depth and branchColor for every node via BFS from roots.
   * Also pre-measures/sets node dimensions per depth.
   */
  _computeMeta() {
    this._nodeMeta.clear();
    this._addBtn = null;

    if (!this._nodes.length) return;

    // Count incoming edges
    const inCount = new Map(this._nodes.map(n => [n.id, 0]));
    for (const e of this._edges) {
      inCount.set(e.to, (inCount.get(e.to) || 0) + 1);
    }

    const roots = this._nodes.filter(n => !inCount.get(n.id));

    // BFS
    const queue = roots.map(r => ({ id: r.id, depth: 0, branchColor: r.color || this._COLORS[0] }));
    const visited = new Set();

    // Assign depth 0 to all roots first
    for (const r of roots) {
      this._nodeMeta.set(r.id, { depth: 0, branchColor: r.color || this._COLORS[0] });
      visited.add(r.id);
    }

    while (queue.length) {
      const { id, depth, branchColor } = queue.shift();
      const childDepth = depth + 1;

      for (const e of this._edges) {
        if (e.from !== id) continue;
        if (visited.has(e.to)) continue;
        visited.add(e.to);

        const child = this._nodes.find(n => n.id === e.to);
        if (!child) continue;

        // Level-1 children get their own color as branchColor
        const childBranchColor = depth === 0
          ? (child.color || branchColor)
          : branchColor;

        this._nodeMeta.set(e.to, { depth: childDepth, branchColor: childBranchColor });
        queue.push({ id: e.to, depth: childDepth, branchColor: childBranchColor });
      }
    }

    // Disconnected nodes (not reached from any root) → depth 0
    for (const n of this._nodes) {
      if (!this._nodeMeta.has(n.id)) {
        this._nodeMeta.set(n.id, { depth: 0, branchColor: n.color || this._COLORS[0] });
      }
    }
  }

  /** Returns visual width/height for a node at a given depth. */
  _nodeDims(node, depth) {
    if (depth === 0) return { w: node.width || 180, h: 54 };
    if (depth === 1) return { w: node.width || 148, h: 40 };
    // Leaf: measure text
    const text = node.text || 'Nó';
    this._ctx.save();
    this._ctx.font = '500 13px "Inter", system-ui, sans-serif';
    const tw = this._ctx.measureText(text).width;
    this._ctx.restore();
    return { w: Math.max(tw + 20, 60), h: 32 };
  }

  // ── Draw ──────────────────────────────────────────────────────────────────

  _draw() {
    const c   = this._canvas;
    const ctx = this._ctx;
    const W   = c.width  / this._dpr;
    const H   = c.height / this._dpr;

    ctx.clearRect(0, 0, W, H);

    // Subtle dot grid (very faint, MindMeister-like)
    this._drawGrid(ctx, W, H);

    ctx.save();
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    // Recompute metadata each frame (cheap for typical node counts)
    this._computeMeta();

    // 1) Edges
    for (const edge of this._edges) {
      const from = this._nodes.find(n => n.id === edge.from);
      const to   = this._nodes.find(n => n.id === edge.to);
      if (!from || !to) continue;
      const fromMeta = this._nodeMeta.get(from.id) || { depth: 0, branchColor: from.color };
      const toMeta   = this._nodeMeta.get(to.id)   || { depth: 0, branchColor: to.color };
      this._drawEdge(ctx, from, fromMeta, to, toMeta, edge);
    }

    // 2) Live connecting preview
    if (this._connecting && this._mouseWorld) {
      const from = this._nodes.find(n => n.id === this._connecting.fromId);
      if (from) {
        const fm = this._nodeMeta.get(from.id) || { depth: 0, branchColor: from.color };
        const fd = this._nodeDims(from, fm.depth);
        const sx = from.x + fd.w / 2;
        const sy = from.y;
        const ex = this._mouseWorld.x;
        const ey = this._mouseWorld.y;
        const cpx = (sx + ex) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = this._currentColor;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.6;
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(cpx, sy, cpx, ey, ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // 3) Nodes
    for (const node of this._nodes) {
      const meta = this._nodeMeta.get(node.id) || { depth: 0, branchColor: node.color };
      this._drawNode(ctx, node, meta);
    }

    // 4) Add-child button for selected node
    if (this._selected?.type === 'node') {
      const node = this._nodes.find(n => n.id === this._selected.id);
      if (node) {
        const meta = this._nodeMeta.get(node.id) || { depth: 0, branchColor: node.color };
        this._drawAddButton(ctx, node, meta);
      }
    }

    ctx.restore();

    this._syncEmpty();
  }

  _drawGrid(ctx, W, H) {
    const isDark = !document.body.classList.contains('light');
    const dotColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    const spacing = 28;

    // Adjust for pan/zoom so dots stay aligned to world
    const startX = ((this._offsetX % (spacing * this._scale)) + spacing * this._scale) % (spacing * this._scale);
    const startY = ((this._offsetY % (spacing * this._scale)) + spacing * this._scale) % (spacing * this._scale);

    ctx.fillStyle = dotColor;
    for (let gx = startX; gx < W; gx += spacing * this._scale) {
      for (let gy = startY; gy < H; gy += spacing * this._scale) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ── Node Renderers ────────────────────────────────────────────────────────

  _drawNode(ctx, node, meta) {
    const { depth, branchColor } = meta;
    const color      = node.color || branchColor || '#8B5CF6';
    const isSelected = this._selected?.type === 'node' && this._selected.id === node.id;
    const isHovered  = this._hoveredNode === node.id;
    const { w, h }   = this._nodeDims(node, depth);

    // Update stored dims for hit testing
    node._w = w;
    node._h = h;

    if (depth === 0) {
      this._drawRootNode(ctx, node, color, w, h, isSelected, isHovered);
    } else if (depth === 1) {
      this._drawBranchNode(ctx, node, color, w, h, isSelected, isHovered);
    } else {
      this._drawLeafNode(ctx, node, color, w, h, isSelected, isHovered);
    }
  }

  /** Root node: large rounded rect with gradient + glow */
  _drawRootNode(ctx, node, color, w, h, isSelected, isHovered) {
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const r = 16;

    ctx.save();

    // Glow
    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 28;
    } else if (isHovered) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 16;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur  = 14;
      ctx.shadowOffsetY = 4;
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, this._shade(color, -0.22));
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = grad;
    ctx.fill();

    // Shine
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const shine = ctx.createLinearGradient(x, y, x, y + h * 0.5);
    shine.addColorStop(0, 'rgba(255,255,255,0.22)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w - 2, h * 0.5 - 1, [r, r, 0, 0]);
    ctx.fillStyle = shine;
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, w + 6, h + 6, r + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Text
    ctx.font         = '700 15px "Inter", system-ui, sans-serif';
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.fillText(this._truncate(ctx, node.text || '', w - 24), node.x, node.y);

    ctx.restore();
  }

  /** Branch node: pill (depth 1) */
  _drawBranchNode(ctx, node, color, w, h, isSelected, isHovered) {
    const x = node.x - w / 2;
    const y = node.y - h / 2;
    const r = h / 2; // Full pill

    ctx.save();

    if (isSelected) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 22;
    } else if (isHovered) {
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
    } else {
      ctx.shadowColor  = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur   = 8;
      ctx.shadowOffsetY = 3;
    }

    // Fill
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();

    // Shine
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const shine = ctx.createLinearGradient(x, y, x, y + h * 0.55);
    shine.addColorStop(0, 'rgba(255,255,255,0.2)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w - 2, h * 0.5, [r, r, 0, 0]);
    ctx.fillStyle = shine;
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, w + 6, h + 6, r + 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Text
    ctx.font         = '600 13px "Inter", system-ui, sans-serif';
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._truncate(ctx, node.text || '', w - 20), node.x, node.y);

    ctx.restore();
  }

  /**
   * Leaf node (depth 2+): texto com sublinhado colorido — estilo MindMeister.
   * Sem caixa de fundo visível.
   */
  _drawLeafNode(ctx, node, color, w, h, isSelected, isHovered) {
    const text     = node.text || 'Nó';
    const isDark   = !document.body.classList.contains('light');
    const textColor = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(0,0,0,0.82)';

    ctx.save();

    ctx.font         = '500 13px "Inter", system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const tw = ctx.measureText(text).width;
    const lx = node.x - tw / 2;
    const rx = node.x + tw / 2;
    const ly = node.y + 9; // underline Y

    // Text shadow if selected/hovered
    if (isSelected || isHovered) {
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 8;
    }

    ctx.fillStyle = isSelected ? color : (isHovered ? color : textColor);
    ctx.fillText(text, node.x, node.y);

    // Underline
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth   = isSelected ? 2.5 : 1.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(lx - 2, ly);
    ctx.lineTo(rx + 2, ly);
    ctx.stroke();

    ctx.restore();
  }

  // ── Edge Renderer ─────────────────────────────────────────────────────────

  /**
   * MindMeister-style: bezier edge-to-edge (lado do nó, não centro).
   * Sem arrowhead para mapas mentais; com arrowhead para conceituais.
   */
  _drawEdge(ctx, from, fromMeta, to, toMeta, edge) {
    const isSelected   = this._selected?.type === 'edge' && this._selected.id === edge.id;
    const fromColor    = from.color || fromMeta.branchColor || '#8B5CF6';
    const toColor      = to.color   || toMeta.branchColor   || '#06B6D4';
    const branchColor  = fromMeta.depth === 0 ? toColor : fromColor;

    const fd = this._nodeDims(from, fromMeta.depth);
    const td = this._nodeDims(to,   toMeta.depth);

    // Determine horizontal direction to choose edge side
    const goRight = to.x >= from.x;

    // Start: right or left edge of the "from" node
    const sx = goRight
      ? from.x + fd.w / 2
      : from.x - fd.w / 2;
    const sy = from.y;

    // End: left or right edge of the "to" node (for leaves: the underline end)
    let ex, ey;
    if (toMeta.depth >= 2) {
      const ctx2 = this._ctx;
      ctx2.font = '500 13px "Inter", system-ui, sans-serif';
      const tw = ctx2.measureText(to.text || 'Nó').width;
      ex = goRight ? to.x - tw / 2 - 2 : to.x + tw / 2 + 2;
      ey = to.y + 9; // underline level
    } else {
      ex = goRight ? to.x - td.w / 2 : to.x + td.w / 2;
      ey = to.y;
    }

    // Control points: smooth S-curve
    const dx   = Math.abs(ex - sx);
    const cpOff = Math.max(dx * 0.45, 60);
    const cp1x  = sx + (goRight ?  cpOff : -cpOff);
    const cp1y  = sy;
    const cp2x  = ex + (goRight ? -cpOff :  cpOff);
    const cp2y  = ey;

    // Line width by depth
    const lw = fromMeta.depth === 0 ? 3 : fromMeta.depth === 1 ? 2.2 : 1.8;

    ctx.save();

    // Gradient stroke
    const grad = ctx.createLinearGradient(sx, sy, ex, ey);
    grad.addColorStop(0, fromColor);
    grad.addColorStop(1, toColor);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);

    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = lw + 1;
      ctx.globalAlpha = 1;
    } else {
      ctx.strokeStyle = branchColor;
      ctx.lineWidth   = lw;
      ctx.globalAlpha = 0.75;
    }
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Arrowhead — ONLY for concept maps
    if (this._map?.type === 'concept') {
      const angle = Math.atan2(ey - cp2y, ex - cp2x);
      this._arrowHead(ctx, ex, ey, angle, isSelected ? '#ffffff' : toColor);
    }

    // Edge label (concept maps)
    if (edge.label && this._map?.type === 'concept') {
      const lbx = (sx + ex) / 2;
      const lby = (sy + ey) / 2;
      ctx.font      = '500 10.5px "Inter", sans-serif';
      const lw2     = ctx.measureText(edge.label.slice(0, 16)).width + 14;
      ctx.fillStyle = 'rgba(10,10,20,0.82)';
      ctx.beginPath();
      ctx.roundRect(lbx - lw2 / 2, lby - 10, lw2, 20, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.fillStyle    = 'rgba(255,255,255,0.9)';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label.slice(0, 16), lbx, lby);
    }

    ctx.restore();
  }

  _arrowHead(ctx, x, y, angle, color) {
    const len = 10;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * Math.cos(angle - 0.38), y - len * Math.sin(angle - 0.38));
    ctx.lineTo(x - len * Math.cos(angle + 0.38), y - len * Math.sin(angle + 0.38));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Add-Child Button ──────────────────────────────────────────────────────

  /** Draws the floating "+" button to the right of the selected node. */
  _drawAddButton(ctx, node, meta) {
    const { w } = this._nodeDims(node, meta.depth);
    const color = node.color || meta.branchColor || '#8B5CF6';
    const bx = node.x + w / 2 + 22;
    const by = node.y;
    const br = 13;

    const isHov = this._hoveredAdd;

    ctx.save();

    // Drop shadow
    ctx.shadowColor  = color;
    ctx.shadowBlur   = isHov ? 16 : 8;
    ctx.shadowOffsetY = 2;

    // Circle fill
    ctx.beginPath();
    ctx.arc(bx, by, br + (isHov ? 2 : 0), 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // "+" symbol
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    const arm = 5.5;
    ctx.beginPath();
    ctx.moveTo(bx - arm, by);
    ctx.lineTo(bx + arm, by);
    ctx.moveTo(bx, by - arm);
    ctx.lineTo(bx, by + arm);
    ctx.stroke();

    ctx.restore();

    // Store in world coords for click detection
    this._addBtn = { x: bx, y: by, r: br + 4, parentId: node.id };
  }

  // ── Mouse Utilities ───────────────────────────────────────────────────────

  _toWorld(e) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left  - this._offsetX) / this._scale,
      y: (e.clientY - rect.top   - this._offsetY) / this._scale,
    };
  }

  _hitNode(wx, wy) {
    for (let i = this._nodes.length - 1; i >= 0; i--) {
      const n   = this._nodes[i];
      const meta = this._nodeMeta.get(n.id) || { depth: 0 };
      const { w, h } = this._nodeDims(n, meta.depth);
      const hw = w / 2, hh = h / 2 + (meta.depth >= 2 ? 6 : 0);
      if (wx >= n.x - hw && wx <= n.x + hw && wy >= n.y - hh && wy <= n.y + hh) return n;
    }
    return null;
  }

  _hitAddBtn(wx, wy) {
    if (!this._addBtn) return false;
    const dx = wx - this._addBtn.x;
    const dy = wy - this._addBtn.y;
    return Math.sqrt(dx * dx + dy * dy) <= this._addBtn.r;
  }

  // ── Canvas Events ─────────────────────────────────────────────────────────

  _bindCanvas() {
    const cv = this._canvas;
    cv.addEventListener('dblclick',    e => this._onDblClick(e));
    cv.addEventListener('mousedown',   e => this._onMouseDown(e));
    cv.addEventListener('mousemove',   e => this._onMouseMove(e));
    cv.addEventListener('mouseup',     e => this._onMouseUp(e));
    cv.addEventListener('mouseleave',  () => { this._hoveredNode = null; this._hoveredAdd = false; });
    cv.addEventListener('contextmenu', e => this._onContextMenu(e));
    cv.addEventListener('wheel',       e => this._onWheel(e), { passive: false });
    document.addEventListener('keydown', e => this._onKeyDown(e));
    document.addEventListener('click',   e => {
      if (this._contextMenu && !this._contextMenu.contains(e.target)) this._closeCtx();
    });

    this._editInput.addEventListener('blur',    () => this._commitEdit());
    this._editInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); this._commitEdit(); }
      if (e.key === 'Escape') this._editInput.classList.add('hidden');
    });
  }

  _onDblClick(e) {
    this._closeCtx();
    const { x, y } = this._toWorld(e);
    const hit = this._hitNode(x, y);
    if (hit) { this._startEdit(hit); return; }
    this._createNode(x, y, null);
  }

  _onMouseDown(e) {
    if (e.button !== 0) return;
    this._closeCtx();
    const { x, y } = this._toWorld(e);
    this._mouseWorld = { x, y };

    // Add-child button click
    if (this._hitAddBtn(x, y) && this._addBtn) {
      this._addChildNode(this._addBtn.parentId);
      return;
    }

    const hit = this._hitNode(x, y);

    if (hit && (e.shiftKey || this._connectMode)) {
      this._connecting = { fromId: hit.id };
      return;
    }
    if (hit) {
      this._selected = { type: 'node', id: hit.id };
      this._dragging = { nodeId: hit.id, startX: e.clientX, startY: e.clientY, origX: hit.x, origY: hit.y };
      this._canvas.classList.add('mm-grabbing');
      return;
    }

    // Pan
    this._panning  = true;
    this._panStart = { x: e.clientX - this._offsetX, y: e.clientY - this._offsetY };
    this._selected = null;
    this._canvas.classList.add('mm-grabbing');
  }

  _onMouseMove(e) {
    const { x, y } = this._toWorld(e);
    this._mouseWorld = { x, y };

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
    this._hoveredAdd  = this._hitAddBtn(x, y);

    if (this._connectMode) {
      this._canvas.className = 'mm-cross';
    } else if (this._hoveredAdd) {
      this._canvas.className = 'mm-pointer';
    } else if (hit) {
      this._canvas.className = 'mm-pointer';
    } else {
      this._canvas.className = 'mm-grab';
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;
    this._canvas.classList.remove('mm-grabbing');

    if (this._connecting) {
      const { x, y } = this._toWorld(e);
      const hit = this._hitNode(x, y);
      if (hit && hit.id !== this._connecting.fromId) {
        const exists = this._edges.some(
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
    const rect   = this._canvas.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    this._offsetX = mx - factor * (mx - this._offsetX);
    this._offsetY = my - factor * (my - this._offsetY);
    this._scale   = Math.max(0.2, Math.min(4, this._scale * factor));
    this._updateZoomLabel();
  }

  _onKeyDown(e) {
    if (this.el.classList.contains('hidden')) return;
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;

    switch (e.key) {
      case 'Delete':
      case 'Backspace':
        if (this._selected) this._deleteSelected();
        break;
      case 's': case 'S':
        this._setMode(false); break;
      case 'c': case 'C':
        this._setMode(true);  break;
      case '0':
        this._scale = 1; this._offsetX = 0; this._offsetY = 0;
        this._updateZoomLabel(); break;
      case '+': case '=': this._zoomBy(1.2); break;
      case '-':            this._zoomBy(1 / 1.2); break;
      case 'Escape':
        this._selected   = null;
        this._connecting = null;
        this._closeCtx();
        break;
      case 'Tab':
        // Tab on selected node = add child (MindMeister shortcut)
        if (this._selected?.type === 'node') {
          e.preventDefault();
          this._addChildNode(this._selected.id);
        }
        break;
      case 'Enter':
        // Enter on selected node = edit
        if (this._selected?.type === 'node') {
          e.preventDefault();
          const n = this._nodes.find(n => n.id === this._selected.id);
          if (n) this._startEdit(n);
        }
        break;
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    const { x, y } = this._toWorld(e);
    const hit = this._hitNode(x, y);
    if (hit) this._selected = { type: 'node', id: hit.id };
    this._showCtx(e, hit);
  }

  // ── Toolbar Events ────────────────────────────────────────────────────────

  _bindToolbar() {
    // Mode buttons
    document.getElementById('mm-sel')?.addEventListener('click', () => this._setMode(false));
    document.getElementById('mm-con')?.addEventListener('click', () => this._setMode(true));

    // Zoom
    document.getElementById('mm-zin') ?.addEventListener('click', () => this._zoomBy(1.25));
    document.getElementById('mm-zout')?.addEventListener('click', () => this._zoomBy(1 / 1.25));
    document.getElementById('mm-zrst')?.addEventListener('click', () => {
      this._scale = 1; this._offsetX = 0; this._offsetY = 0;
      this._updateZoomLabel();
    });

    // Actions
    document.getElementById('mm-del-sel')?.addEventListener('click', () => this._deleteSelected());
    document.getElementById('mm-ai')      ?.addEventListener('click', () => {
      if (this._map) EventBus.emit('ui:openNotebookLMMindMapModal', { map: this._map });
    });
    document.getElementById('mm-del-map') ?.addEventListener('click', () => {
      if (this._map) EventBus.emit('ui:deleteMindMap', { mapId: this._map.id });
    });
    document.getElementById('mm-export')  ?.addEventListener('click', () => this._exportPNG());

    // Color palette
    this.el.querySelectorAll('.mm-color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        this._currentColor = btn.dataset.color;
        this.el.querySelectorAll('.mm-color-dot').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this._selected?.type === 'node') {
          const n = this._nodes.find(n => n.id === this._selected.id);
          if (n) { n.color = btn.dataset.color; this._save(); }
        }
      });
    });
  }

  _setMode(connect) {
    this._connectMode = connect;
    document.getElementById('mm-con')?.classList.toggle('active', connect);
    document.getElementById('mm-sel')?.classList.toggle('active', !connect);
    this._canvas.className = connect ? 'mm-cross' : '';
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  _zoomBy(factor) {
    const wrap = document.getElementById('mm-wrap');
    if (!wrap) return;
    const cx = wrap.offsetWidth / 2;
    const cy = wrap.offsetHeight / 2;
    this._offsetX = cx - factor * (cx - this._offsetX);
    this._offsetY = cy - factor * (cy - this._offsetY);
    this._scale   = Math.max(0.2, Math.min(4, this._scale * factor));
    this._updateZoomLabel();
  }

  _updateZoomLabel() {
    if (this._zoomLabel) this._zoomLabel.textContent = Math.round(this._scale * 100) + '%';
  }

  // ── Context Menu ──────────────────────────────────────────────────────────

  _showCtx(e, node) {
    this._closeCtx();
    const menu = document.createElement('div');
    menu.className = 'mm-ctx-menu';

    const svg = {
      edit:   '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
      child:  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      center: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      trash:  '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>',
      add:    '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      fit:    '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v5h5"/></svg>',
    };

    const items = node ? [
      { icon: svg.edit,   label: 'Editar texto',      action: () => this._startEdit(node) },
      { icon: svg.child,  label: 'Adicionar filho',   action: () => this._addChildNode(node.id) },
      { icon: svg.center, label: 'Centralizar',        action: () => this._centerOn(node) },
      { sep: true },
      { icon: svg.trash,  label: 'Apagar nó',         action: () => {
          this._selected = { type: 'node', id: node.id };
          this._deleteSelected();
        }, danger: true },
    ] : [
      { icon: svg.add,    label: 'Criar nó aqui',     action: () => {
          const rect = this._canvas.getBoundingClientRect();
          const wx = (e.clientX - rect.left - this._offsetX) / this._scale;
          const wy = (e.clientY - rect.top  - this._offsetY) / this._scale;
          this._createNode(wx, wy, null);
        }},
      { icon: svg.fit,    label: 'Centralizar tudo',  action: () => {
          this._scale = 1; this._offsetX = 0; this._offsetY = 0;
          this._updateZoomLabel();
        }},
    ];

    items.forEach(item => {
      if (item.sep) {
        const sep = document.createElement('div');
        sep.className = 'mm-ctx-sep';
        menu.appendChild(sep);
        return;
      }
      const el = document.createElement('div');
      el.className = 'mm-ctx-item' + (item.danger ? ' danger' : '');
      el.innerHTML = `${item.icon}<span>${item.label}</span>`;
      el.addEventListener('click', () => { item.action(); this._closeCtx(); });
      menu.appendChild(el);
    });

    const wrap = document.getElementById('mm-wrap');
    wrap.appendChild(menu);
    this._contextMenu = menu;

    const wRect = wrap.getBoundingClientRect();
    let left = e.clientX - wRect.left + 4;
    let top  = e.clientY - wRect.top  + 4;
    if (left + 190 > wrap.offsetWidth)  left -= 185;
    if (top  + 200 > wrap.offsetHeight) top  = Math.max(4, top - 160);
    menu.style.left = left + 'px';
    menu.style.top  = top  + 'px';
  }

  _closeCtx() {
    if (this._contextMenu) { this._contextMenu.remove(); this._contextMenu = null; }
  }

  _centerOn(node) {
    const wrap = document.getElementById('mm-wrap');
    if (!wrap) return;
    this._offsetX = wrap.offsetWidth  / 2 - node.x * this._scale;
    this._offsetY = wrap.offsetHeight / 2 - node.y * this._scale;
  }

  // ── Node Operations ───────────────────────────────────────────────────────

  _createNode(wx, wy, parentId) {
    const node = {
      id:     _uuid(),
      x:      wx,
      y:      wy,
      text:   'Novo nó',
      color:  this._currentColor,
      width:  140,
      height: 44,
    };
    this._nodes.push(node);

    if (parentId) {
      // Inherit parent color for branch cohesion
      const parent = this._nodes.find(n => n.id === parentId);
      if (parent) node.color = parent.color || this._currentColor;
      this._edges.push({ id: _uuid(), from: parentId, to: node.id, label: '' });
    }

    this._save();
    this._selected = { type: 'node', id: node.id };
    setTimeout(() => this._startEdit(node), 40);
  }

  /**
   * Smart-position a new child node relative to its parent.
   * Tries to avoid overlapping existing children.
   */
  _addChildNode(parentId) {
    const parent = this._nodes.find(n => n.id === parentId);
    if (!parent) return;

    const meta     = this._nodeMeta.get(parentId) || { depth: 0 };
    const { w: pw } = this._nodeDims(parent, meta.depth);

    // Collect existing children X positions to spread new node
    const children = this._edges
      .filter(e => e.from === parentId)
      .map(e => this._nodes.find(n => n.id === e.to))
      .filter(Boolean);

    const childDepth = (meta.depth || 0) + 1;
    const childW     = childDepth === 1 ? 148 : 130;
    const hGap       = pw / 2 + childW / 2 + 60;
    const vGap       = 60;

    let cx, cy;
    if (children.length === 0) {
      cx = parent.x + hGap;
      cy = parent.y;
    } else {
      // Place below the last child
      const lastChild = children[children.length - 1];
      cx = parent.x + hGap;
      cy = lastChild.y + vGap;
    }

    this._createNode(cx, cy, parentId);
  }

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

  // ── Node Edit ─────────────────────────────────────────────────────────────

  _startEdit(node) {
    const input = this._editInput;
    const meta  = this._nodeMeta.get(node.id) || { depth: 0 };
    const { w }  = this._nodeDims(node, meta.depth);
    const sx     = node.x * this._scale + this._offsetX;
    const sy     = node.y * this._scale + this._offsetY;
    const iw     = Math.max(w * this._scale, 100);

    input.value          = node.text;
    input.style.left     = (sx - iw / 2) + 'px';
    input.style.top      = (sy - 18) + 'px';
    input.style.width    = iw + 'px';
    input.dataset.nodeId = node.id;
    input.classList.remove('hidden');
    input.focus();
    input.select();
  }

  _commitEdit() {
    const input  = this._editInput;
    const nodeId = input.dataset.nodeId;
    if (!nodeId) return;
    const n = this._nodes.find(n => n.id === nodeId);
    if (n) { n.text = input.value.trim() || 'Nó'; this._save(); }
    input.classList.add('hidden');
    delete input.dataset.nodeId;
  }

  // ── Export PNG ────────────────────────────────────────────────────────────

  _exportPNG() {
    if (!this._nodes.length) return;
    const pad = 52;
    const xs  = this._nodes.map(n => n.x - (n._w || 130) / 2);
    const xe  = this._nodes.map(n => n.x + (n._w || 130) / 2);
    const ys  = this._nodes.map(n => n.y - (n._h || 44)  / 2 - 10);
    const ye  = this._nodes.map(n => n.y + (n._h || 44)  / 2 + 10);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xe) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ye) + pad;
    const W = maxX - minX, H = maxY - minY;

    const tc   = document.createElement('canvas');
    const sc   = 2;
    tc.width   = W * sc;
    tc.height  = H * sc;
    const tctx = tc.getContext('2d');
    tctx.scale(sc, sc);
    tctx.translate(-minX, -minY);

    // Background
    const isDark = !document.body.classList.contains('light');
    tctx.fillStyle = isDark ? '#111215' : '#f5f6fa';
    tctx.fillRect(minX, minY, W, H);

    // Dot grid
    tctx.fillStyle = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
    for (let gx = minX; gx < maxX; gx += 28) {
      for (let gy = minY; gy < maxY; gy += 28) {
        tctx.beginPath();
        tctx.arc(gx, gy, 1, 0, Math.PI * 2);
        tctx.fill();
      }
    }

    // Store temp ctx reference for drawing methods
    const origCtx = this._ctx;
    this._ctx = tctx;
    this._computeMeta();

    for (const e of this._edges) {
      const f = this._nodes.find(n => n.id === e.from);
      const t = this._nodes.find(n => n.id === e.to);
      if (!f || !t) continue;
      const fm = this._nodeMeta.get(f.id) || { depth: 0, branchColor: f.color };
      const tm = this._nodeMeta.get(t.id) || { depth: 0, branchColor: t.color };
      this._drawEdge(tctx, f, fm, t, tm, e);
    }
    for (const n of this._nodes) {
      const m = this._nodeMeta.get(n.id) || { depth: 0, branchColor: n.color };
      this._drawNode(tctx, n, m);
    }

    this._ctx = origCtx;

    const link = document.createElement('a');
    link.download = `${this._map?.name || 'mapa'}.png`;
    link.href = tc.toDataURL('image/png');
    link.click();
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  _syncEmpty() {
    const el = document.getElementById('mm-empty');
    if (el) el.style.display = this._nodes.length ? 'none' : 'flex';
  }

  _save() {
    if (!this._map) return;
    EventBus.emit('mindmap:save', { mapId: this._map.id, nodes: this._nodes, edges: this._edges });
  }

  _truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 0 && ctx.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }

  /** Darken a hex color by a fraction (0–1). */
  _shade(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, Math.round(r * (1 + amount))));
    g = Math.max(0, Math.min(255, Math.round(g * (1 + amount))));
    b = Math.max(0, Math.min(255, Math.round(b * (1 + amount))));
    return `rgb(${r},${g},${b})`;
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._closeCtx();
  }
}
