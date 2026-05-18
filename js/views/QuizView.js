'use strict';

/**
 * QuizView — Interface de Quizzes e Simulados gerados por I.A com animações e score radial.
 */
class QuizView {
  constructor() {
    this.el = document.getElementById('view-quizzes');
    this._activeQuiz = null;
    this._currentQuestionIndex = 0;
    this._selectedOptionIndex = null;
    this._answerConfirmed = false;
    this._correctCount = 0;
    this._userAnswers = []; // Armazena as respostas selecionadas pelo usuário
  }

  render(quizzes, subject, allSubjects, materials = []) {
    if (!subject) {
      this.el.innerHTML = `
        <div class="view-content">
          <div class="empty-state">
            <div class="empty-icon">🧠</div>
            <h2>Simulados & Quizzes com I.A</h2>
            <p>Selecione uma matéria na barra lateral para começar a praticar com simulados.</p>
          </div>
        </div>`;
      return;
    }

    // Se estivermos respondendo a um Quiz específico
    if (this._activeQuiz) {
      this._renderQuizPlay(subject);
      return;
    }

    // Caso contrário, renderiza a lista de Quizzes cadastrados para esta matéria
    const subjectQuizzes = quizzes.filter(q => q.subjectId === subject.id);

    this.el.innerHTML = `
      <div class="view-content" style="display:flex; flex-direction:column; gap:24px; padding:32px 48px; overflow-y:auto; height:100vh;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <h1 style="font-size:1.6rem; font-weight:700; display:flex; align-items:center; gap:8px; margin:0;">
              <span>🧠</span> Simulados & Quizzes com I.A
            </h1>
            <p style="margin:4px 0 0 0; font-size:0.85rem; color:var(--text-muted);">Teste seus conhecimentos de forma ativa e mensure seu progresso.</p>
          </div>
          <button class="btn-primary" id="btn-trigger-ai-quiz" style="display:flex; align-items:center; gap:8px; font-weight:600; padding:10px 16px;">
            <span>🪄</span> Gerar com I.A
          </button>
        </div>

        <!-- Seção de Simulados Disponíveis -->
        <div class="dashboard-section" style="margin-top:8px;">
          <h2 class="section-title">📝 Simulados Cadastrados</h2>
          <div class="quizzes-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
            ${subjectQuizzes.length === 0 
              ? `<div style="grid-column:1/-1; text-align:center; padding:48px 24px; background:var(--bg-card); border: 1px dashed var(--border); border-radius:var(--radius-md); color:var(--text-muted);">
                   <p style="margin:0 0 8px 0; font-size:0.9rem; font-weight:600; color:var(--text);">Nenhum simulado disponível.</p>
                   <span style="font-size:0.75rem; display:block; max-width:350px; margin:0 auto;">Crie um novo simulado personalizado gerado pela I.A clicando no botão acima!</span>
                 </div>`
              : subjectQuizzes.map(q => {
                  const isDone = q.score !== null;
                  let badgeColor = 'var(--text-muted)';
                  let badgeText = 'Não iniciado';
                  if (isDone) {
                    badgeColor = q.score >= 70 ? '#10B981' : q.score >= 50 ? '#F59E0B' : '#EF4444';
                    badgeText = `Pontuação: ${q.score}%`;
                  }

                  return `
                    <div class="quiz-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); transition: all 0.2s ease; box-shadow: var(--shadow-sm);">
                      <div>
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; gap:8px;">
                          <span style="font-size:0.7rem; font-weight:700; padding:4px 8px; border-radius:var(--radius-sm); background:color-mix(in srgb, ${badgeColor} 12%, var(--bg-card)); color:${badgeColor};">${badgeText}</span>
                          <button class="btn-icon btn-delete-quiz" data-quiz-id="${q.id}" style="color:var(--text-muted);" title="Excluir">
                            <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                          </button>
                        </div>
                        <h3 style="margin:0 0 8px 0; font-size:1rem; font-weight:650; color:var(--text); line-height:1.4;">${q.title}</h3>
                        <p style="margin:0 0 20px 0; font-size:0.75rem; color:var(--text-muted);">${q.questions.length} questões objetivas</p>
                      </div>
                      
                      <button class="btn-primary btn-sm btn-start-quiz" data-quiz-id="${q.id}" style="width:100%; display:flex; justify-content:center; align-items:center; gap:8px; font-weight:600; padding:10px;">
                        <span>${isDone ? 'Refazer Simulado' : 'Iniciar Simulado'}</span>
                        <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; fill:none; stroke-width:2.5;"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>
      </div>
    `;

    this._bindEvents(subject, materials);
  }

  _renderQuizPlay(subject) {
    const questions = this._activeQuiz.questions;
    const isCompleted = this._currentQuestionIndex >= questions.length;

    // Se concluiu todas as perguntas, renderiza tela final de pontuação
    if (isCompleted) {
      this._renderQuizSummary(subject);
      return;
    }

    const q = questions[this._currentQuestionIndex];
    const progressPct = ((this._currentQuestionIndex) / questions.length) * 100;

    this.el.innerHTML = `
      <div class="view-content" style="display:flex; flex-direction:column; gap:24px; padding:32px 48px; overflow-y:auto; height:100vh; align-items:center;">
        
        <div style="width:100%; max-width:650px; display:flex; flex-direction:column; gap:16px;">
          <!-- Cabeçalho de Navegação Rápida -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--text-muted); font-weight:600;">
            <button class="btn-ghost btn-sm" id="btn-quit-quiz" style="display:flex; align-items:center; gap:4px; font-weight:600;">
              ⬅ Sair
            </button>
            <span>Matéria: ${subject.emoji} ${subject.name}</span>
            <span>Pergunta ${this._currentQuestionIndex + 1} de ${questions.length}</span>
          </div>

          <!-- Barra de Progresso do Quiz -->
          <div style="width:100%; height:4px; background:var(--border); border-radius:2px; overflow:hidden;">
            <div style="width:${progressPct}%; height:100%; background:var(--accent); transition: width 0.3s ease;"></div>
          </div>

          <!-- Card de Pergunta Principal -->
          <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:28px; box-shadow:var(--shadow-md); margin-top:8px; display:flex; flex-direction:column; gap:20px;">
            <h2 style="margin:0; font-size:1.15rem; font-weight:650; color:var(--text); line-height:1.5;">${q.question}</h2>

            <!-- Alternativas de Opções -->
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${q.options.map((option, idx) => {
                const isSelected = this._selectedOptionIndex === idx;
                const isCorrect = q.answerIndex === idx;
                
                let optionStyle = `background: var(--bg); border: 1px solid var(--border);`;
                let optionBadge = '';

                if (this._answerConfirmed) {
                  if (isCorrect) {
                    optionStyle = `background: rgba(16, 185, 129, 0.08); border: 2px solid #10B981; color: var(--text);`;
                    optionBadge = `<span style="color:#10B981; font-weight:700; margin-left:auto;">✔️ Correta</span>`;
                  } else if (isSelected) {
                    optionStyle = `background: rgba(239, 68, 68, 0.08); border: 2px solid #EF4444; color: var(--text);`;
                    optionBadge = `<span style="color:#EF4444; font-weight:700; margin-left:auto;">❌ Sua Resposta</span>`;
                  } else {
                    optionStyle = `background: var(--bg-card); border: 1px solid var(--border); opacity:0.6;`;
                  }
                } else if (isSelected) {
                  optionStyle = `background: rgba(139, 92, 246, 0.08); border: 2px solid var(--accent); color: var(--text);`;
                }

                return `
                  <div class="quiz-option-card ${this._answerConfirmed ? 'locked' : ''} ${isSelected ? 'selected' : ''}" 
                       data-option-idx="${idx}"
                       style="display:flex; align-items:center; padding:16px 20px; border-radius:var(--radius-sm); cursor:pointer; font-size:0.9rem; font-weight:550; transition:all 0.15s ease; ${optionStyle}">
                    <span style="font-weight:700; color:var(--text-muted); margin-right:12px; background:var(--border); width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; font-size:0.75rem;">${String.fromCharCode(65 + idx)}</span>
                    <span style="flex:1; min-width:0; word-break:break-word;">${option}</span>
                    ${optionBadge}
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Explicação cognitivamente rica após confirmar -->
            ${this._answerConfirmed 
              ? `<div class="quiz-explanation-card" style="padding:16px 20px; background:color-mix(in srgb, ${subject.color} 5%, var(--bg)); border-left:4px solid ${subject.color}; border-radius:var(--radius-sm); font-size:0.82rem; line-height:1.4; color:var(--text-muted); animation: slideDown 0.3s ease;">
                   <strong style="color:var(--text); display:block; margin-bottom:4px;">💡 Explicação Teórica:</strong>
                   ${q.explanation}
                 </div>`
              : ''
            }

            <!-- Botão de Ação -->
            <button class="btn-primary" id="btn-action-quiz" style="width:100%; padding:12px; font-weight:650; display:flex; justify-content:center; align-items:center; gap:8px; margin-top:8px;" ${this._selectedOptionIndex === null ? 'disabled' : ''}>
              <span>${this._answerConfirmed ? 'Próxima Pergunta' : 'Confirmar Resposta'}</span>
              <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; fill:none; stroke-width:2.5;"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>

      </div>
    `;

    this._bindPlayEvents();
  }

  _renderQuizSummary(subject) {
    const questions = this._activeQuiz.questions;
    const scorePct = Math.round((this._correctCount / questions.length) * 100);

    // Salvar pontuação de forma persistente
    EventBus.emit('ui:saveQuizScore', { 
      quizId: this._activeQuiz.id, 
      score: scorePct,
      subjectId: subject.id
    });

    let emoji = '📚';
    let feedbackText = 'Continue estudando e revisando os flashcards para dominar a matéria!';
    let feedbackTitle = 'Bom esforço!';
    let strokeColor = '#EF4444';

    if (scorePct === 100) {
      emoji = '🏆';
      feedbackTitle = 'Desempenho Perfeito!';
      feedbackText = 'Sensacional! Você demonstrou domínio absoluto desse tópico. Parabéns!';
      strokeColor = '#10B981';
    } else if (scorePct >= 70) {
      emoji = '🧠';
      feedbackTitle = 'Excelente Aproveitamento!';
      feedbackText = 'Muito bem! Você está com um nível de fixação muito forte sobre esta matéria.';
      strokeColor = '#10B981';
    } else if (scorePct >= 50) {
      emoji = '⚖️';
      feedbackTitle = 'Bom Progresso!';
      feedbackText = 'Você está no caminho certo. Uma breve revisão nas suas anotações te levará ao topo!';
      strokeColor = '#F59E0B';
    }

    const radius = 60;
    const circ = 2 * Math.PI * radius;
    const dash = circ - (scorePct / 100) * circ;

    this.el.innerHTML = `
      <div class="view-content" style="display:flex; flex-direction:column; gap:24px; padding:32px 48px; overflow-y:auto; height:100vh; align-items:center; justify-content:center;">
        
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:40px; box-shadow:var(--shadow-md); max-width:550px; width:100%; text-align:center; display:flex; flex-direction:column; align-items:center; gap:20px;">
          <div style="font-size:3.5rem; margin-bottom:4px;">${emoji}</div>
          <h2 style="margin:0; font-size:1.4rem; font-weight:700; color:var(--text);">${feedbackTitle}</h2>
          <p style="margin:0 0 8px 0; font-size:0.85rem; color:var(--text-muted); line-height:1.4; max-width:400px;">${feedbackText}</p>

          <!-- Gráfico de Círculo Radial Premium -->
          <div style="position:relative; width:150px; height:150px;">
            <svg viewBox="0 0 150 150" style="width:100%; height:100%; transform: rotate(-90deg);">
              <circle cx="75" cy="75" r="${radius}" fill="none" stroke="var(--border)" stroke-width="8"/>
              <circle cx="75" cy="75" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="10"
                      stroke-dasharray="${circ}" stroke-dashoffset="${dash}" stroke-linecap="round"
                      style="transition: stroke-dashoffset 1s ease-in-out;"/>
            </svg>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <span style="font-size:1.8rem; font-weight:750; color:var(--text); font-family:'Inter', sans-serif;">${scorePct}%</span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-top:2px;">${this._correctCount} de ${questions.length} acertos</span>
            </div>
          </div>

          <button class="btn-primary" id="btn-finish-quiz" style="width:100%; padding:12px; font-weight:650; display:flex; justify-content:center; align-items:center; gap:8px; margin-top:12px;">
            Finalizar Simulado
          </button>
        </div>

      </div>
    `;

    document.getElementById('btn-finish-quiz')?.addEventListener('click', () => {
      this._activeQuiz = null;
      EventBus.emit('navigate', { view: 'quizzes', subjectId: subject.id });
    });
  }

  _bindEvents(subject, materials) {
    // Iniciar Simulado
    this.el.querySelectorAll('.btn-start-quiz').forEach(btn => {
      btn.addEventListener('click', () => {
        const quizId = btn.dataset.quizId;
        EventBus.emit('ui:startQuizSession', { quizId, subjectId: subject.id });
      });
    });

    // Excluir Simulado
    this.el.querySelectorAll('.btn-delete-quiz').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const quizId = btn.dataset.quizId;
        if (confirm('Tem certeza que deseja excluir este simulado permanentemente?')) {
          EventBus.emit('ui:deleteQuiz', { quizId, subjectId: subject.id });
        }
      });
    });

    // Gerar com I.A modal trigger
    this.el.querySelector('#btn-trigger-ai-quiz')?.addEventListener('click', () => {
      const materialDropdown = materials.length > 0 
        ? `
          <div>
            <label class="modal-label">📚 Basear no material de estudo (Opcional)</label>
            <select id="modal-quiz-material" class="modal-input" style="width:100%; border-radius:var(--radius-sm); font-size:0.85rem; padding:8px;">
              <option value="">-- Nenhum material (Gerar com base no tema geral) --</option>
              ${materials.map(m => `<option value="${m.id}">${m.emoji} ${m.name}</option>`).join('')}
            </select>
          </div>
        `
        : '';

      EventBus.emit('ui:openModalQuiz', {
        html: `
          <h2>🪄 Gerador de Simulados por I.A</h2>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:4px 0 16px 0;">Defina o tema desejado para a I.A gerar 5 perguntas cognitivas específicas.</p>
          <div style="display:flex; flex-direction:column; gap:16px; margin: 16px 0;">
            <div>
              <label class="modal-label">Tema do Simulado</label>
              <input id="modal-quiz-theme" class="modal-input" type="text" placeholder="Ex: Programação Orientada a Objetos, Guerra Fria, Anatomia Humana..." style="width:100%;">
            </div>
            ${materialDropdown}
            <div style="font-size:0.75rem; color:var(--text-muted); border-top:1px solid var(--border); padding-top:12px; margin-top:8px;">
              💡 <em>Caso não possua chave Gemini API configurada no aplicativo, utilizaremos nosso Simulador Cognitivo local para gerar um quiz estruturado instantâneo!</em>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" id="modal-cancel">Cancelar</button>
            <button class="btn-primary" id="modal-generate-quiz">Gerar Simulado</button>
          </div>
        `,
        callback: () => {
          document.getElementById('modal-generate-quiz')?.addEventListener('click', () => {
            const theme = document.getElementById('modal-quiz-theme')?.value.trim();
            const materialId = document.getElementById('modal-quiz-material')?.value || null;

            if (!theme) {
              alert('Por favor, defina um tema para o seu simulado.');
              return;
            }

            EventBus.emit('ui:generateAIQuiz', { 
              subjectId: subject.id, 
              theme, 
              materialId 
            });
          });
          document.getElementById('modal-quiz-theme')?.focus();
        }
      });
    });
  }

  _bindPlayEvents() {
    // Sair do simulado
    document.getElementById('btn-quit-quiz')?.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja sair do simulado atual? Suas respostas não serão salvas.')) {
        this._activeQuiz = null;
        this._selectedOptionIndex = null;
        this._answerConfirmed = false;
        this._correctCount = 0;
        this._userAnswers = [];
        this._currentQuestionIndex = 0;
        this.render([], null, []); // Força render padrão (AppController cuidará do fluxo real)
        EventBus.emit('navigate', { view: 'dashboard' });
      }
    });

    // Seleção de alternativa
    this.el.querySelectorAll('.quiz-option-card').forEach(card => {
      card.addEventListener('click', () => {
        if (this._answerConfirmed) return; // Opções travadas após confirmar

        this._selectedOptionIndex = parseInt(card.dataset.optionIdx);
        
        // Re-renderiza para atualizar estilo visual
        this._renderQuizPlay(this._activeQuiz);
      });
    });

    // Botão de confirmação / Próxima
    const actionBtn = document.getElementById('btn-action-quiz');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        const q = this._activeQuiz.questions[this._currentQuestionIndex];

        if (!this._answerConfirmed) {
          // Confirmar Resposta
          this._answerConfirmed = true;
          this._userAnswers.push(this._selectedOptionIndex);

          if (this._selectedOptionIndex === q.answerIndex) {
            this._correctCount++;
            // Tocar um bipe ou feedback rápido se desejado
          }
          this._renderQuizPlay(this._activeQuiz);
        } else {
          // Ir para a Próxima Pergunta
          this._answerConfirmed = false;
          this._selectedOptionIndex = null;
          this._currentQuestionIndex++;
          this._renderQuizPlay(this._activeQuiz);
        }
      });
    }
  }

  startSession(quiz) {
    this._activeQuiz = quiz;
    this._currentQuestionIndex = 0;
    this._selectedOptionIndex = null;
    this._answerConfirmed = false;
    this._correctCount = 0;
    this._userAnswers = [];
  }
}
