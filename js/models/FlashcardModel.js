'use strict';

/**
 * FlashcardModel — Gerencia os flashcards de memorização por matéria usando o algoritmo Leitner.
 */
class FlashcardModel {
  constructor() {
    const raw = localStorage.getItem('flashcards');
    if (raw === null) {
      this.flashcards = [];
      this._seed();
    } else {
      try {
        this.flashcards = JSON.parse(raw) || [];
      } catch (e) {
        this.flashcards = [];
      }
    }
  }

  getAll() { return [...this.flashcards]; }

  getBySubject(subjectId) {
    return this.flashcards.filter(c => c.subjectId === subjectId);
  }

  getDueBySubject(subjectId) {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.getBySubject(subjectId).filter(c => c.nextReviewDate <= todayStr);
  }

  getById(id) {
    return this.flashcards.find(c => c.id === id) || null;
  }

  create(subjectId, front, back) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const card = {
      id: _uuid(),
      subjectId,
      front: front.trim(),
      back: back.trim(),
      box: 1, // Começa na caixa 1 (revisão diária)
      nextReviewDate: todayStr,
      createdAt: new Date().toISOString()
    };
    this.flashcards.push(card);
    this._save();
    EventBus.emit('flashcards:updated', this.getAll());
    return card;
  }

  delete(id) {
    this.flashcards = this.flashcards.filter(c => c.id !== id);
    this._save();
    EventBus.emit('flashcards:updated', this.getAll());
  }

  /**
   * Atualiza o estado da caixa e data de revisão com base no desempenho do usuário (Algoritmo Leitner).
   */
  score(id, isCorrect) {
    const card = this.getById(id);
    if (!card) return;

    if (isCorrect) {
      card.box = Math.min(card.box + 1, 5); // Avança até no máximo a caixa 5
    } else {
      card.box = 1; // Resposta errada retrocede imediatamente para a caixa 1
    }

    // Calcular dias até a próxima revisão
    // Caixa 1: 1 dia | Caixa 2: 2 dias | Caixa 3: 4 dias | Caixa 4: 7 dias | Caixa 5: 14 dias
    const intervals = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };
    const days = intervals[card.box];

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    card.nextReviewDate = nextDate.toISOString().slice(0, 10);

    this._save();
    EventBus.emit('flashcards:updated', this.getAll());
  }

  _seed() {
    this.flashcards = [
      {
        id: 'fc1',
        subjectId: 's1', // Vinculado a ex: Programação/Geral se existir
        front: 'O que é o Event Loop no JavaScript?',
        back: 'É o mecanismo que permite ao JS executar operações não-bloqueantes de I/O, gerenciando a pilha de execução (call stack) e a fila de callbacks (callback queue).',
        box: 1,
        nextReviewDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      },
      {
        id: 'fc2',
        subjectId: 's1',
        front: 'Diferença entre == e ===',
        back: 'O operador == compara apenas os valores realizando coerção de tipo automática se necessário. Já o operador === compara o valor E o tipo, sem realizar coerção.',
        box: 2,
        nextReviewDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      }
    ];
    this._save();
  }

  _save() { Storage.set('flashcards', this.flashcards); }
}
