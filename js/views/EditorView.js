'use strict';

/**
 * EditorView — Editor de blocos estilo Notion.
 * Suporta: text, h1, h2, h3, bullet, numbered, checkbox, divider, quote
 * Comando "/" para selecionar tipo de bloco.
 */
class EditorView {
  constructor() {
    this.el      = document.getElementById('view-editor');
    this.page    = null;
    this.subject = null;
    this._saveTimer = null;
  }

  render(page, subject) {
    this.page    = page;
    this.subject = subject;

    this.el.innerHTML = `
      <div class="editor-wrap">
        <div class="editor-topbar">
          <div class="editor-breadcrumb">
            <span style="color:${subject?.color||'#8B5CF6'}">${subject?.emoji||'📄'} ${subject?.name||'Sem matéria'}</span>
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            <span>${page.title}</span>
          </div>
          <div class="editor-actions">
            <button class="btn-sm" id="btn-delete-page">🗑 Excluir</button>
          </div>
        </div>

        <div class="editor-body">
          <h1 class="page-title" contenteditable="true" spellcheck="false" data-placeholder="Sem título">${this._esc(page.title)}</h1>

          <div class="blocks-container" id="blocks-container">
            ${page.blocks.map(b => this._renderBlock(b)).join('')}
          </div>

          <div class="slash-menu hidden" id="slash-menu">
            ${this._slashMenu()}
          </div>
        </div>
      </div>
    `;

    this._bindEditor();
  }

  _renderBlock(block) {
    const { id, type, content, checked } = block;
    switch (type) {
      case 'h1':       return `<h1  class="block" data-id="${id}" data-type="h1" contenteditable="true" spellcheck="false">${content}</h1>`;
      case 'h2':       return `<h2  class="block" data-id="${id}" data-type="h2" contenteditable="true" spellcheck="false">${content}</h2>`;
      case 'h3':       return `<h3  class="block" data-id="${id}" data-type="h3" contenteditable="true" spellcheck="false">${content}</h3>`;
      case 'bullet':   return `<div class="block block-bullet" data-id="${id}" data-type="bullet"><span class="bullet-dot">•</span><span class="block-text" contenteditable="true" spellcheck="false">${content}</span></div>`;
      case 'numbered': return `<div class="block block-numbered" data-id="${id}" data-type="numbered"><span class="num-dot">1.</span><span class="block-text" contenteditable="true" spellcheck="false">${content}</span></div>`;
      case 'checkbox': return `<div class="block block-checkbox" data-id="${id}" data-type="checkbox"><input type="checkbox" ${checked?'checked':''}><span class="block-text ${checked?'checked':''}" contenteditable="true" spellcheck="false">${content}</span></div>`;
      case 'divider':  return `<div class="block block-divider" data-id="${id}" data-type="divider"><hr></div>`;
      case 'quote':    return `<blockquote class="block block-quote" data-id="${id}" data-type="quote" contenteditable="true" spellcheck="false">${content}</blockquote>`;
      default:         return `<p class="block block-text" data-id="${id}" data-type="text" contenteditable="true" spellcheck="false" data-placeholder="Escreva algo ou use '/' para comandos">${content}</p>`;
    }
  }

  _slashMenu() {
    const items = [
      { type:'text',     icon:'T',  label:'Texto',         desc:'Parágrafo simples' },
      { type:'h1',       icon:'H1', label:'Título 1',      desc:'Título grande' },
      { type:'h2',       icon:'H2', label:'Título 2',      desc:'Título médio' },
      { type:'h3',       icon:'H3', label:'Título 3',      desc:'Título pequeno' },
      { type:'bullet',   icon:'•',  label:'Lista',         desc:'Lista com marcadores' },
      { type:'numbered', icon:'1.', label:'Lista numerada',desc:'Lista ordenada' },
      { type:'checkbox', icon:'☑',  label:'Checkbox',      desc:'Lista de tarefas' },
      { type:'quote',    icon:'"',  label:'Citação',       desc:'Bloco de citação' },
      { type:'divider',  icon:'—',  label:'Divisor',       desc:'Linha horizontal' },
    ];
    return `<div class="slash-menu-inner">
      ${items.map(i => `<button class="slash-item" data-type="${i.type}">
        <span class="slash-icon">${i.icon}</span>
        <span class="slash-label">${i.label}</span>
        <span class="slash-desc">${i.desc}</span>
      </button>`).join('')}
    </div>`;
  }

  _bindEditor() {
    const container  = document.getElementById('blocks-container');
    const slashMenu  = document.getElementById('slash-menu');
    const titleEl    = this.el.querySelector('.page-title');
    let   activeBlockId = null;

    // Title editing
    titleEl.addEventListener('input', () => this._scheduleSave());
    titleEl.addEventListener('blur', () => {
      const newTitle = titleEl.textContent.trim() || 'Sem título';
      EventBus.emit('editor:updateTitle', { pageId: this.page.id, title: newTitle });
    });

    // Delete page
    document.getElementById('btn-delete-page')?.addEventListener('click', () => {
      if (confirm('Excluir esta página?')) EventBus.emit('editor:deletePage', { pageId: this.page.id });
    });

    // Slash menu items
    slashMenu.querySelectorAll('.slash-item').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._changeBlockType(activeBlockId, btn.dataset.type, container);
        this._hideSlashMenu(slashMenu);
      });
    });

    // Block events (delegation)
    container.addEventListener('keydown', (e) => this._onKeyDown(e, container, slashMenu, titleEl));
    container.addEventListener('input',   () => { this._scheduleSave(); this._renumberLists(container); });
    container.addEventListener('focus',   (e) => {
      const block = e.target.closest('[data-id]');
      if (block) activeBlockId = block.dataset.id;
    }, true);

    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const block = e.target.closest('[data-id]');
        if (block) {
          const textEl = block.querySelector('.block-text');
          textEl.classList.toggle('checked', e.target.checked);
          this._scheduleSave();
        }
      }
    });

    // Close slash menu on click outside
    document.addEventListener('click', (e) => {
      if (!slashMenu.contains(e.target)) this._hideSlashMenu(slashMenu);
    });
  }

  _onKeyDown(e, container, slashMenu, titleEl) {
    const target = e.target;
    const block  = target.closest('[data-id]');
    if (!block) return;

    const id = block.dataset.id;
    const slashVisible = !slashMenu.classList.contains('hidden');

    // Navigate slash menu with arrows
    if (slashVisible) {
      if (e.key === 'Escape') { e.preventDefault(); this._hideSlashMenu(slashMenu); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = [...slashMenu.querySelectorAll('.slash-item')];
        const cur = slashMenu.querySelector('.slash-item.focused');
        const idx = cur ? items.indexOf(cur) : -1;
        const next = e.key === 'ArrowDown' ? (idx+1)%items.length : (idx-1+items.length)%items.length;
        cur?.classList.remove('focused');
        items[next]?.classList.add('focused');
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const focused = slashMenu.querySelector('.slash-item.focused');
        if (focused) { this._changeBlockType(id, focused.dataset.type, container); this._hideSlashMenu(slashMenu); }
        return;
      }
    }

    if (e.key === '/') {
      const text = this._getBlockText(block);
      if (text === '') {
        e.preventDefault();
        this._showSlashMenu(slashMenu, block);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.dataset.type === 'divider') return;
      e.preventDefault();
      this._insertBlockAfter(id, container);
      return;
    }

    if (e.key === 'Backspace') {
      const text = this._getBlockText(block);
      if (text === '' && container.querySelectorAll('[data-id]').length > 1) {
        e.preventDefault();
        this._deleteBlock(id, container);
      }
    }
  }

  _showSlashMenu(slashMenu, block) {
    const rect = block.getBoundingClientRect();
    const editorRect = this.el.getBoundingClientRect();
    slashMenu.style.top  = (rect.bottom - editorRect.top + 4) + 'px';
    slashMenu.style.left = (rect.left   - editorRect.left)    + 'px';
    slashMenu.classList.remove('hidden');
  }

  _hideSlashMenu(slashMenu) {
    slashMenu.classList.add('hidden');
    slashMenu.querySelectorAll('.slash-item.focused').forEach(i => i.classList.remove('focused'));
  }

  _getBlockText(block) {
    const textEl = block.querySelector('.block-text') || block;
    return textEl.textContent.replace('/', '').trim();
  }

  _changeBlockType(id, newType, container) {
    const blocks = this._collectBlocks(container);
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    blocks[idx] = { ...blocks[idx], type: newType, content: '', checked: false };
    container.innerHTML = blocks.map(b => this._renderBlock(b)).join('');
    this._renumberLists(container);
    // Focus new block
    const newBlock = container.querySelector(`[data-id="${id}"]`);
    const focusEl = newBlock?.querySelector('.block-text') || newBlock;
    focusEl?.focus();
    this._scheduleSave();
  }

  _insertBlockAfter(id, container) {
    const newId = _uuid();
    const blocks = this._collectBlocks(container);
    const idx = blocks.findIndex(b => b.id === id);
    const currentType = blocks[idx]?.type;
    const inheritType = ['bullet','numbered','checkbox'].includes(currentType) ? currentType : 'text';
    blocks.splice(idx+1, 0, { id: newId, type: inheritType, content: '', checked: false });
    container.innerHTML = blocks.map(b => this._renderBlock(b)).join('');
    this._renumberLists(container);
    const newBlock = container.querySelector(`[data-id="${newId}"]`);
    const focusEl = newBlock?.querySelector('.block-text') || newBlock;
    focusEl?.focus();
    this._scheduleSave();
  }

  _deleteBlock(id, container) {
    const blocks = this._collectBlocks(container);
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    blocks.splice(idx, 1);
    container.innerHTML = blocks.map(b => this._renderBlock(b)).join('');
    this._renumberLists(container);
    const prev = container.querySelectorAll('[data-id]')[Math.max(0, idx-1)];
    const focusEl = prev?.querySelector('.block-text') || prev;
    focusEl?.focus();
    this._scheduleSave();
  }

  _renumberLists(container) {
    let n = 1;
    container.querySelectorAll('[data-type="numbered"]').forEach(b => {
      const dot = b.querySelector('.num-dot');
      if (dot) { dot.textContent = `${n}.`; n++; }
    });
  }

  _collectBlocks(container) {
    return [...container.querySelectorAll('[data-id]')].map(el => {
      const type    = el.dataset.type;
      const textEl  = el.querySelector('.block-text') || el;
      const content = type === 'divider' ? '' : textEl.textContent;
      const checkbox = el.querySelector('input[type=checkbox]');
      return { id: el.dataset.id, type, content, checked: checkbox?.checked || false };
    });
  }

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const container = document.getElementById('blocks-container');
      const titleEl   = this.el.querySelector('.page-title');
      if (!container || !this.page) return;
      const blocks  = this._collectBlocks(container);
      const title   = titleEl?.textContent.trim() || 'Sem título';
      EventBus.emit('editor:save', { pageId: this.page.id, title, blocks });
    }, 600);
  }

  _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
}
