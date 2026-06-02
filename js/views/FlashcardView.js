'use strict';

/**
 * FlashcardView — Interface de criação e estudo de Flashcards com efeito 3D.
 */
class FlashcardView {
  constructor() {
    this.el = document.getElementById('view-flashcards');
    this._studyIndex = 0;
    this._isFlipped = false;
  }

  render(cards, subject, allSubjects) {
    if (!subject) {
      this.el.innerHTML = `
        <div class="view-content">
          <div class="empty-state">
            <div class="empty-icon">🗂️</div>
            <h2>Flashcards de Memorização</h2>
            <p>Selecione uma matéria na barra lateral para começar a criar e revisar flashcards.</p>
          </div>
        </div>`;
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueCards = cards.filter(c => c.nextReviewDate <= todayStr);
    const totalCount = cards.length;
    const dueCount = dueCards.length;

    let studySectionHtml = '';
    if (dueCount > 0) {
      if (this._studyIndex >= dueCount) {
        this._studyIndex = 0; // Reset index se estourar
      }
      const activeCard = dueCards[this._studyIndex];

      studySectionHtml = `
        <div class="flashcard-study-container" style="display:flex; flex-direction:column; align-items:center; gap:20px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:32px; box-shadow:var(--shadow-md); max-width:550px; width:100%; margin: 0 auto 32px auto;">
          <div style="display:flex; justify-content:space-between; width:100%; font-size:0.75rem; color:var(--text-muted); font-weight:600;">
            <span>Matéria: ${subject.emoji} ${subject.name}</span>
            <span>Card ${this._studyIndex + 1} de ${dueCount} pendentes</span>
          </div>

          <!-- Cena 3D para virar o card -->
          <div class="flashcard-scene" style="perspective: 1000px; width: 100%; height: 240px; cursor: pointer;">
            <div class="flashcard-card-3d ${this._isFlipped ? 'flipped' : ''}" style="width: 100%; height: 100%; position: relative; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
              
              <!-- Frente do Card -->
              <div class="flashcard-face flashcard-front" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: color-mix(in srgb, ${subject.color} 5%, var(--bg-3)); border: 2px solid ${subject.color}; border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; box-shadow: var(--shadow-sm);">
                <div style="font-size: 0.75rem; font-weight: 700; color: ${subject.color}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Pergunta 🤔</div>
                <div style="font-size: 1.2rem; font-weight: 650; color: var(--text); overflow-y: auto; max-height: 120px;">${activeCard.front}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: auto;">💡 Clique para revelar a resposta</div>
              </div>

              <!-- Verso do Card -->
              <div class="flashcard-face flashcard-back" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: var(--bg-card); border: 2px solid var(--border); border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; transform: rotateY(180deg); box-shadow: var(--shadow-sm);">
                <div style="font-size: 0.75rem; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Resposta Revelada 💡</div>
                <div style="font-size: 1.1rem; font-weight: 550; color: var(--text); overflow-y: auto; max-height: 120px; line-height: 1.4;">${activeCard.back}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: auto; font-style: italic;">Caixa de Leitner atual: #${activeCard.box}</div>
              </div>

            </div>
          </div>

          <!-- Controles de Resposta -->
          <div class="flashcard-study-controls" style="display:flex; gap:16px; width:100%; justify-content:center; ${this._isFlipped ? '' : 'opacity:0.4; pointer-events:none;'}">
            <button class="btn-danger btn-sm btn-rate-card" data-correct="false" style="padding: 10px 20px; font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>❌</span> Errei
            </button>
            <button class="btn-success btn-sm btn-rate-card" data-correct="true" style="padding: 10px 20px; font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>🟢</span> Acertei!
            </button>
          </div>
        </div>
      `;
    } else {
      studySectionHtml = `
        <div class="flashcard-completed-container" style="text-align:center; padding:40px 20px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); max-width:550px; width:100%; margin: 0 auto 32px auto; box-shadow:var(--shadow-sm);">
          <div style="font-size:3rem; margin-bottom:12px;">🎉</div>
          <h3 style="margin:0 0 6px 0; font-size:1.15rem; font-weight:700; color:var(--text);">Tudo limpo por hoje!</h3>
          <p style="margin:0 0 16px 0; font-size:0.85rem; color:var(--text-muted);">Você revisou todos os flashcards programados para esta matéria.</p>
          <span style="font-size:0.75rem; background:rgba(16, 185, 129, 0.12); color:#10B981; padding:6px 12px; border-radius:var(--radius-sm); font-weight:600; display:inline-block;">Revisão em Dia</span>
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="view-content" style="display:flex; flex-direction:column; gap:24px; padding:32px 48px; overflow-y:auto; height:100vh;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:700; display:flex; align-items:center; gap:8px; margin:0;">
              <span>🗂️</span> Flashcards de Memorização
            </h1>
            <p style="margin:4px 0 0 0; font-size:0.85rem; color:var(--text-muted);">Pratique a repetição espaçada ativa para fixar o conteúdo.</p>
          </div>
          <div style="background:var(--bg-card); padding:8px 16px; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:0.8rem; font-weight:600; display:flex; gap:16px;">
            <span>Total: <strong>${totalCount} cards</strong></span>
            <span style="color:${dueCount > 0 ? 'var(--accent)' : 'var(--text-muted)'};">Revisar hoje: <strong>${dueCount}</strong></span>
          </div>
        </div>

        <!-- Área de Estudo -->
        ${studySectionHtml}

        <!-- Seção Inferior: Criação e Listagem de Cartões -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-top:16px; align-items:start; flex-wrap:wrap;">
          
          <!-- Formulário de Criação -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:20px; box-shadow:var(--shadow-sm);">
            <h3 style="margin:0 0 16px 0; font-size:0.95rem; font-weight:700; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:8px;">
              📝 Criar Novo Flashcard
              <button class="btn-ai-fc btn-primary btn-sm" id="btn-ai-generate-fc" style="background: linear-gradient(135deg,#1a73e8,#34a853); font-size:0.78rem; padding:5px 10px; gap:5px; display:flex; align-items:center;">
                <svg viewBox="0 0 24 24" style="width:13px;height:13px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;">
                  <rect width="24" height="24" rx="3" fill="#1a73e8"/>
                  <path d="M6 8h12M6 12h8M6 16h10" stroke="#fff" stroke-width="1.6"/>
                </svg>
                NotebookLM
              </button>
            </h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Pergunta / Frente</label>
                <textarea id="fc-front-input" class="modal-input" placeholder="Digite a pergunta ou conceito a memorizar..." rows="3" style="width:100%; border-radius:var(--radius-sm); font-size:0.85rem; resize:none;"></textarea>
              </div>
              <div>
                <label style="display:block; font-size:0.75rem; font-weight:600; color:var(--text-muted); margin-bottom:4px;">Resposta / Verso</label>
                <textarea id="fc-back-input" class="modal-input" placeholder="Digite a resposta ou definição detalhada..." rows="3" style="width:100%; border-radius:var(--radius-sm); font-size:0.85rem; resize:none;"></textarea>
              </div>
              <button class="btn-primary btn-sm" id="btn-create-flashcard" style="width:100%; padding:10px; font-weight:600; margin-top:8px;">
                Adicionar Card
              </button>
            </div>
          </div>

          <!-- Listagem de Todos os Cartões -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:20px; box-shadow:var(--shadow-sm); max-height:450px; display:flex; flex-direction:column;">
            <h3 style="margin:0 0 16px 0; font-size:0.95rem; font-weight:700; color:var(--text); border-bottom:1px solid var(--border); padding-bottom:8px;">
              📚 Cartões da Matéria (${totalCount})
            </h3>
            <div class="fc-list-container" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:4px;">
              ${cards.length === 0 
                ? '<div style="text-align:center; padding:32px; color:var(--text-muted); font-size:0.8rem;">Nenhum card cadastrado. Crie o primeiro ao lado!</div>'
                : cards.map(c => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--bg); border:1px solid var(--border); border-radius:var(--radius-sm); gap:12px;">
                    <div style="flex:1; min-width:0;">
                      <div style="font-weight:600; font-size:0.8rem; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${c.front}">${c.front}</div>
                      <div style="font-size:0.7rem; color:var(--text-muted); display:flex; gap:10px; margin-top:2px;">
                        <span>Caixa: #${c.box}</span>
                        <span>Próxima revisão: ${c.nextReviewDate}</span>
                      </div>
                    </div>
                    <button class="btn-icon btn-delete-fc" data-fc-id="${c.id}" style="color:var(--text-muted); padding:4px;" title="Excluir">
                      <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                `).join('')
              }
            </div>
          </div>

        </div>
      </div>
    `;

    this._bindEvents(subject.id, dueCards);
  }

  _bindEvents(subjectId, dueCards) {
    // Virar Card 3D ao clicar
    const cardEl = this.el.querySelector('.flashcard-card-3d');
    if (cardEl) {
      cardEl.addEventListener('click', () => {
        this._isFlipped = !this._isFlipped;
        cardEl.classList.toggle('flipped', this._isFlipped);
        const controls = this.el.querySelector('.flashcard-study-controls');
        if (controls) {
          controls.style.opacity = this._isFlipped ? '1' : '0.4';
          controls.style.pointerEvents = this._isFlipped ? 'all' : 'none';
        }
      });
    }

    // Avaliar Card (Acerto / Erro)
    this.el.querySelectorAll('.btn-rate-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isCorrect = btn.dataset.correct === 'true';
        const activeCard = dueCards[this._studyIndex];
        if (activeCard) {
          EventBus.emit('ui:scoreFlashcard', { 
            cardId: activeCard.id, 
            isCorrect,
            subjectId
          });
          
          // Animação de avanço ou rotação
          this._isFlipped = false;
          this._studyIndex++;
        }
      });
    });

    // Gerar Flashcards com NotebookLM
    this.el.querySelector('#btn-ai-generate-fc')?.addEventListener('click', () => {
      EventBus.emit('ui:openNotebookLMFlashcardModal', { subjectId });
    });

    // Criar Flashcard
    this.el.querySelector('#btn-create-flashcard')?.addEventListener('click', () => {
      const front = this.el.querySelector('#fc-front-input')?.value.trim();
      const back = this.el.querySelector('#fc-back-input')?.value.trim();

      if (!front || !back) {
        alert('Por favor, preencha a Pergunta (Frente) e a Resposta (Verso) do card.');
        return;
      }

      EventBus.emit('ui:createFlashcard', { subjectId, front, back });
    });

    // Deletar Flashcard
    this.el.querySelectorAll('.btn-delete-fc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.fcId;
        if (confirm('Deseja excluir permanentemente este card de memorização?')) {
          EventBus.emit('ui:deleteFlashcard', { id, subjectId });
        }
      });
    });
  }
}
