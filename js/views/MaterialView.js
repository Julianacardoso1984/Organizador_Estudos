'use strict';

/**
 * MaterialView — Upload e visualização de materiais de estudo.
 */
class MaterialView {
  constructor() {
    this.el = document.getElementById('view-materials');
  }

  render(materials, subject, allSubjects) {
    const typeIcon = { pdf:'📄', image:'🖼', audio:'🎵', video:'🎬', doc:'📝', slide:'📊', other:'📎' };

    this.el.innerHTML = `
      <div class="view-content materials-content">
        <div class="view-header">
          <h1>${subject?.emoji||'📎'} ${subject?.name||'Materiais'} — Materiais</h1>
          <div class="view-header-actions">
            <select id="mat-subject-filter" class="select-input">
              <option value="">Todas as matérias</option>
              ${allSubjects.map(s=>`<option value="${s.id}" ${s.id===subject?.id?'selected':''}>${s.emoji} ${s.name}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="drop-zone" id="drop-zone">
          <div class="drop-zone-inner">
            <div class="drop-icon">📁</div>
            <p class="drop-text">Arraste arquivos aqui</p>
            <p class="drop-subtext">PDF, imagens, áudio, vídeo, documentos</p>
            <label class="btn-primary" style="cursor:pointer">
              Selecionar Arquivo
              <input type="file" id="file-input" multiple accept="*/*" style="display:none">
            </label>
          </div>
        </div>

        ${materials.length === 0 ? `
          <div class="empty-state small">
            <p>Nenhum material ainda. Faça upload acima!</p>
          </div>` : `
          <div class="materials-grid" id="materials-grid">
            ${materials.map(m => this._renderCard(m, typeIcon, allSubjects)).join('')}
          </div>`}
      </div>`;

    this._bindEvents(subject, allSubjects);
  }

  _renderCard(m, typeIcon, subjects) {
    const subject = subjects.find(s=>s.id===m.subjectId);
    const sizeStr = this._fmtSize(m.size);
    const date    = new Date(m.uploadedAt).toLocaleDateString('pt-BR');
    return `
      <div class="material-card" data-material-id="${m.id}">
        <div class="material-icon">${typeIcon[m.type]||'📎'}</div>
        <div class="material-info">
          <div class="material-name" title="${m.name}">${m.name}</div>
          <div class="material-meta">
            ${subject?`<span style="color:${subject.color}">${subject.emoji} ${subject.name}</span>`:''}
            <span>${sizeStr}</span>
            <span>${date}</span>
          </div>
          ${m.tags?.length>0 ? `<div class="material-tags">${m.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>` : ''}
        </div>
        <div class="material-actions">
          <button class="btn-icon btn-preview" data-material-id="${m.id}" title="Visualizar">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon btn-download" data-material-id="${m.id}" title="Baixar">
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn-icon btn-mat-delete" data-material-id="${m.id}" title="Excluir">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>`;
  }

  _bindEvents(currentSubject, allSubjects) {
    // Subject filter
    document.getElementById('mat-subject-filter')?.addEventListener('change', e => {
      EventBus.emit('navigate', {view:'materials', subjectId: e.target.value||null});
    });

    // File input
    document.getElementById('file-input')?.addEventListener('change', e => {
      this._handleFiles([...e.target.files], currentSubject?.id);
    });

    // Drag & drop
    const dz = document.getElementById('drop-zone');
    if (dz) {
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
      dz.addEventListener('drop', e => {
        e.preventDefault();
        dz.classList.remove('drag-over');
        this._handleFiles([...e.dataTransfer.files], currentSubject?.id);
      });
    }

    // Preview
    this.el.querySelectorAll('.btn-preview').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('material:preview', {materialId: btn.dataset.materialId}));
    });

    // Download
    this.el.querySelectorAll('.btn-download').forEach(btn => {
      btn.addEventListener('click', () => EventBus.emit('material:download', {materialId: btn.dataset.materialId}));
    });

    // Delete
    this.el.querySelectorAll('.btn-mat-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        if(confirm('Excluir este material?')) EventBus.emit('material:delete', {materialId: btn.dataset.materialId});
      });
    });
  }

  _handleFiles(files, subjectId) {
    if (!subjectId) {
      EventBus.emit('ui:pickSubjectForUpload', { files });
      return;
    }
    files.forEach(file => EventBus.emit('material:upload', { file, subjectId }));
  }

  _fmtSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1048576).toFixed(1)} MB`;
  }
}
