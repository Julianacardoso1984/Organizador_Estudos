'use strict';

/**
 * MindMapView — Editor de mapas mentais e conceituais via Canvas 2D.
 */
class MindMapView {
  constructor() {
    this.el  = document.getElementById('view-mindmap');
    this._map = null;
    this._nodes = [];
    this._edges = [];

    // Canvas state
    this._scale   = 1;
    this._offsetX = 0;
    this._offsetY = 0;
    this._selected = null;    // {type:'node'|'edge', id}
    this._dragging = null;    // {nodeId, startX, startY, origX, origY}
    this._connecting = null;  // {fromId}
    this._panning  = false;
    this._panStart = null;

    this._canvas  = null;
    this._ctx     = null;
    this._raf     = null;
    this._editInput = null;

    this._NODE_COLORS = ['#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#3B82F6'];
  }

  render(map, subject) {
    this._map    = map;
    this._nodes  = map ? JSON.parse(JSON.stringify(map.nodes)) : [];
    this._edges  = map ? JSON.parse(JSON.stringify(map.edges)) : [];

    this.el.innerHTML = `
      <div class="mindmap-wrap">
        <div class="mindmap-toolbar">
          <div class="mindmap-title">
            <span style="color:${subject?.color||'#8B5CF6'}">${subject?.emoji||'🧠'}</span>
            <span>${map?.name || 'Mapa Mental'}</span>
            <span class="mindmap-type-badge">${map?.type==='concept'?'Conceitual':'Mental'}</span>
          </div>
          <div class="mindmap-tools">
            <button class="tool-btn active" id="mm-tool-select" title="Selecionar (S)">
              <svg viewBox="0 0 24 24"><path d="M5 3l14 9-7 1-4 7z"/></svg>
            </button>
            <button class="tool-btn" id="mm-tool-connect" title="Conectar (C) — Shift+arraste de nó">
              <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
            <div class="tool-separator"></div>
            <div class="color-palette">
              ${this._NODE_COLORS.map(c=>`<button class="color-dot" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
            </div>
            <div class="tool-separator"></div>
            <button class="tool-btn" id="mm-zoom-in" title="Zoom +">+</button>
            <button class="tool-btn" id="mm-zoom-out" title="Zoom -">−</button>
            <button class="tool-btn" id="mm-zoom-reset" title="Resetar zoom">⟳</button>
            <div class="tool-separator"></div>
            <button class="tool-btn danger" id="mm-delete-sel" title="Deletar selecionado (Del)">
              <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>
            <button class="btn-primary btn-sm" id="mm-export">⬇ Exportar PNG</button>
          </div>
        </div>

        <div class="mindmap-canvas-wrap" id="mm-canvas-wrap">
          <canvas id="mm-canvas"></canvas>
          <input class="mm-node-input hidden" id="mm-node-input" type="text" spellcheck="false">
          <div class="mm-hint">Duplo clique para criar nó · Shift+arraste para conectar · Scroll para zoom</div>
        </div>
      </div>`;

    this._initCanvas();
    this._bindCanvasEvents();
    this._bindToolbarEvents();
  }

  _initCanvas() {
    this._canvas   = document.getElementById('mm-canvas');
    this._ctx      = this._canvas.getContext('2d');
    this._editInput = document.getElementById('mm-node-input');

    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    const wrap = document.getElementById('mm-canvas-wrap');
    if (!wrap) return;
    const dpr  = window.devicePixelRatio || 1;
    this._canvas.width  = wrap.offsetWidth  * dpr;
    this._canvas.height = wrap.offsetHeight * dpr;
    this._canvas.style.width  = wrap.offsetWidth  + 'px';
    this._canvas.style.height = wrap.offsetHeight + 'px';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    this._draw();
  }

  _draw() {
    const c = this._canvas, ctx = this._ctx;
    const W = c.width / (window.devicePixelRatio||1);
    const H = c.height/ (window.devicePixelRatio||1);

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(this._offsetX, this._offsetY);
    ctx.scale(this._scale, this._scale);

    // Draw edges
    for (const edge of this._edges) {
      const from = this._nodes.find(n=>n.id===edge.from);
      const to   = this._nodes.find(n=>n.id===edge.to);
      if (!from||!to) continue;
      this._drawEdge(ctx, from, to, edge);
    }

    // Draw connecting preview
    if (this._connecting && this._mousePos) {
      const from = this._nodes.find(n=>n.id===this._connecting.fromId);
      if (from) {
        ctx.beginPath();
        ctx.setLineDash([6,4]);
        ctx.strokeStyle = '#8B5CF6';
        ctx.lineWidth   = 2;
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(this._mousePos.x, this._mousePos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw nodes
    for (const node of this._nodes) {
      this._drawNode(ctx, node);
    }

    ctx.restore();
  }

  _drawNode(ctx, node) {
    const isSelected = this._selected?.type==='node' && this._selected.id===node.id;
    const w = node.width||130, h = node.height||44, r = 10;
    const x = node.x - w/2, y = node.y - h/2;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur  = isSelected ? 16 : 8;

    // Fill
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = node.color || '#8B5CF6';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
    }

    // Text
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 13px Inter, sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline= 'middle';
    const maxW = w - 20;
    const text = this._truncate(ctx, node.text||'', maxW);
    ctx.fillText(text, node.x, node.y);
  }

  _drawEdge(ctx, from, to, edge) {
    const isSelected = this._selected?.type==='edge' && this._selected.id===edge.id;
    ctx.beginPath();
    ctx.strokeStyle = isSelected ? '#8B5CF6' : 'var(--edge-color, #6B7280)';
    ctx.lineWidth   = isSelected ? 2.5 : 1.8;

    // Bezier curve
    const mx = (from.x + to.x) / 2;
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(mx, from.y, mx, to.y, to.x, to.y);
    ctx.stroke();

    // Arrowhead at destination
    const angle  = Math.atan2(to.y - from.y, to.x - from.x);
    const arrLen = 10;
    ctx.beginPath();
    ctx.fillStyle = isSelected ? '#8B5CF6' : '#6B7280';
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - arrLen*Math.cos(angle-0.4), to.y - arrLen*Math.sin(angle-0.4));
    ctx.lineTo(to.x - arrLen*Math.cos(angle+0.4), to.y - arrLen*Math.sin(angle+0.4));
    ctx.closePath();
    ctx.fill();

    // Label (concept maps)
    if (edge.label && this._map?.type==='concept') {
      const lx = (from.x+to.x)/2, ly = (from.y+to.y)/2;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(lx-24, ly-10, 48, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(edge.label.slice(0,10), lx, ly);
    }
  }

  _bindCanvasEvents() {
    const canvas = this._canvas;
    canvas.addEventListener('dblclick',   e => this._onDblClick(e));
    canvas.addEventListener('mousedown',  e => this._onMouseDown(e));
    canvas.addEventListener('mousemove',  e => this._onMouseMove(e));
    canvas.addEventListener('mouseup',    e => this._onMouseUp(e));
    canvas.addEventListener('wheel',      e => this._onWheel(e), {passive:false});
    document.addEventListener('keydown',  e => this._onKeyDown(e));

    this._editInput.addEventListener('blur',   () => this._commitEdit());
    this._editInput.addEventListener('keydown', e => {
      if (e.key==='Enter') { e.preventDefault(); this._commitEdit(); }
      if (e.key==='Escape') { this._editInput.classList.add('hidden'); }
    });
  }

  _bindToolbarEvents() {
    document.getElementById('mm-tool-connect')?.addEventListener('click', () => {
      this._connectMode = !this._connectMode;
      document.getElementById('mm-tool-connect')?.classList.toggle('active', this._connectMode);
      document.getElementById('mm-tool-select')?.classList.toggle('active', !this._connectMode);
    });
    document.getElementById('mm-tool-select')?.addEventListener('click', () => {
      this._connectMode = false;
      document.getElementById('mm-tool-select')?.classList.add('active');
      document.getElementById('mm-tool-connect')?.classList.remove('active');
    });
    document.getElementById('mm-zoom-in')?.addEventListener('click',    () => { this._scale = Math.min(3, this._scale*1.2); });
    document.getElementById('mm-zoom-out')?.addEventListener('click',   () => { this._scale = Math.max(0.3, this._scale/1.2); });
    document.getElementById('mm-zoom-reset')?.addEventListener('click', () => { this._scale=1; this._offsetX=0; this._offsetY=0; });
    document.getElementById('mm-delete-sel')?.addEventListener('click', () => this._deleteSelected());
    document.getElementById('mm-export')?.addEventListener('click',     () => this._exportPNG());

    this.el.querySelectorAll('.color-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this._selected?.type==='node') {
          const n = this._nodes.find(n=>n.id===this._selected.id);
          if (n) { n.color = btn.dataset.color; this._save(); }
        }
      });
    });
  }

  // ── Mouse Helpers ──────────────────────────────────────────────────────────

  _toWorld(e) {
    const rect = this._canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left  - this._offsetX) / this._scale,
      y: (e.clientY - rect.top   - this._offsetY) / this._scale
    };
  }

  _hitNode(wx, wy) {
    for (let i = this._nodes.length-1; i>=0; i--) {
      const n = this._nodes[i];
      const hw = (n.width||130)/2, hh = (n.height||44)/2;
      if (wx>=n.x-hw && wx<=n.x+hw && wy>=n.y-hh && wy<=n.y+hh) return n;
    }
    return null;
  }

  _onDblClick(e) {
    const {x,y} = this._toWorld(e);
    const hit = this._hitNode(x,y);
    if (hit) { this._startEdit(hit); return; }
    // Create new node
    const node = { id:_uuid(), x, y, text:'Novo nó', color:this._currentColor||'#8B5CF6', width:130, height:44 };
    this._nodes.push(node);
    this._save();
    setTimeout(() => this._startEdit(node), 50);
  }

  _onMouseDown(e) {
    const {x,y} = this._toWorld(e);
    this._mousePos = {x,y};
    const hit = this._hitNode(x,y);

    if (hit && (e.shiftKey || this._connectMode)) {
      this._connecting = {fromId: hit.id};
      return;
    }
    if (hit) {
      this._selected = {type:'node', id:hit.id};
      this._dragging = {nodeId:hit.id, startX:e.clientX, startY:e.clientY, origX:hit.x, origY:hit.y};
      return;
    }
    // Pan
    this._panning  = true;
    this._panStart = {x:e.clientX-this._offsetX, y:e.clientY-this._offsetY};
    this._selected = null;
  }

  _onMouseMove(e) {
    const {x,y} = this._toWorld(e);
    this._mousePos = {x,y};

    if (this._dragging) {
      const n = this._nodes.find(n=>n.id===this._dragging.nodeId);
      if (n) {
        n.x = this._dragging.origX + (e.clientX - this._dragging.startX) / this._scale;
        n.y = this._dragging.origY + (e.clientY - this._dragging.startY) / this._scale;
      }
      return;
    }
    if (this._panning) {
      this._offsetX = e.clientX - this._panStart.x;
      this._offsetY = e.clientY - this._panStart.y;
    }
  }

  _onMouseUp(e) {
    if (this._connecting) {
      const {x,y} = this._toWorld(e);
      const hit = this._hitNode(x,y);
      if (hit && hit.id !== this._connecting.fromId) {
        const label = this._map?.type==='concept' ? (prompt('Rótulo da conexão (opcional):') || '') : '';
        this._edges.push({ id:_uuid(), from:this._connecting.fromId, to:hit.id, label });
        this._save();
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
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this._offsetX = mx - factor * (mx - this._offsetX);
    this._offsetY = my - factor * (my - this._offsetY);
    this._scale   = Math.max(0.2, Math.min(4, this._scale * factor));
  }

  _onKeyDown(e) {
    if (!this.el.classList.contains('hidden') && (e.key==='Delete'||e.key==='Backspace') && this._selected) {
      if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
      this._deleteSelected();
    }
  }

  _deleteSelected() {
    if (!this._selected) return;
    if (this._selected.type==='node') {
      this._nodes = this._nodes.filter(n=>n.id!==this._selected.id);
      this._edges = this._edges.filter(e=>e.from!==this._selected.id && e.to!==this._selected.id);
    } else {
      this._edges = this._edges.filter(e=>e.id!==this._selected.id);
    }
    this._selected = null;
    this._save();
  }

  _startEdit(node) {
    const input = this._editInput;
    const wrap  = document.getElementById('mm-canvas-wrap');
    const rect  = wrap.getBoundingClientRect();
    const sx    = node.x * this._scale + this._offsetX;
    const sy    = node.y * this._scale + this._offsetY;
    input.value = node.text;
    input.style.left = (sx - 65) + 'px';
    input.style.top  = (sy - 16) + 'px';
    input.style.width = '130px';
    input.dataset.nodeId = node.id;
    input.classList.remove('hidden');
    input.focus();
    input.select();
  }

  _commitEdit() {
    const input = this._editInput;
    const nodeId = input.dataset.nodeId;
    if (!nodeId) return;
    const n = this._nodes.find(n=>n.id===nodeId);
    if (n) {
      n.text = input.value.trim() || 'Nó';
      this._save();
    }
    input.classList.add('hidden');
    delete input.dataset.nodeId;
  }

  _exportPNG() {
    // Render at 2x resolution
    const tempCanvas = document.createElement('canvas');
    const pad = 40;
    const xs = this._nodes.map(n=>n.x-(n.width||130)/2);
    const xe = this._nodes.map(n=>n.x+(n.width||130)/2);
    const ys = this._nodes.map(n=>n.y-(n.height||44)/2);
    const ye = this._nodes.map(n=>n.y+(n.height||44)/2);
    const minX = Math.min(...xs)-pad, maxX = Math.max(...xe)+pad;
    const minY = Math.min(...ys)-pad, maxY = Math.max(...ye)+pad;
    const W = maxX-minX, H = maxY-minY;
    tempCanvas.width  = W*2; tempCanvas.height = H*2;
    const tctx = tempCanvas.getContext('2d');
    tctx.scale(2,2); tctx.translate(-minX,-minY);
    tctx.fillStyle = document.body.classList.contains('light') ? '#ffffff' : '#191919';
    tctx.fillRect(minX,minY,W,H);
    for (const e of this._edges) {
      const f=this._nodes.find(n=>n.id===e.from), t=this._nodes.find(n=>n.id===e.to);
      if(f&&t) this._drawEdge(tctx,f,t,e);
    }
    for (const n of this._nodes) this._drawNode(tctx,n);
    const link = document.createElement('a');
    link.download = `${this._map?.name||'mapa'}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }

  _save() {
    if (!this._map) return;
    EventBus.emit('mindmap:save', { mapId: this._map.id, nodes: this._nodes, edges: this._edges });
  }

  _truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 0 && ctx.measureText(text+'…').width > maxW) text = text.slice(0,-1);
    return text + '…';
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }
}
