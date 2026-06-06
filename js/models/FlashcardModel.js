'use strict';

/**
 * FlashcardModel — Gerencia os flashcards de memorização por matéria usando o algoritmo Leitner.
 */
class FlashcardModel {
  constructor() {
    this.flashcards = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar flashcards:', error);
    } else {
      this.flashcards = data || [];
      this.flashcards.forEach(f => {
        f.subjectId = f.subject_id;
        f.nextReviewDate = f.next_review ? f.next_review.slice(0, 10) : new Date().toISOString().slice(0, 10);
        f.box = f.box || 1; // if box column is added later, or fallback to 1
        f.createdAt = f.created_at;
      });
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

  async create(subjectId, front, back) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const card = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      question: front.trim(),
      answer: back.trim(),
      next_review: todayStr,
      created_at: new Date().toISOString()
    };
    
    const localCard = { ...card, subjectId: card.subject_id, front: card.question, back: card.answer, box: 1, nextReviewDate: card.next_review, createdAt: card.created_at };
    this.flashcards.push(localCard);
    EventBus.emit('flashcards:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('flashcards').insert(card);
      if (error) console.error('Erro ao salvar flashcard no Supabase:', error);
    }
    return localCard;
  }

  async delete(id) {
    this.flashcards = this.flashcards.filter(c => c.id !== id);
    EventBus.emit('flashcards:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('flashcards').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar flashcard no Supabase:', error);
    }
  }

  /**
   * Atualiza o estado da caixa e data de revisão com base no desempenho do usuário (Algoritmo Leitner).
   */
  async score(id, isCorrect) {
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

    EventBus.emit('flashcards:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { next_review: card.nextReviewDate, last_reviewed: new Date().toISOString() };
      // O campo box precisaria ser adicionado à tabela `flashcards` no banco, ou podemos ignorar de salvar e salvar apenas no app ou em extra column. Para compatibilidade, salve o `next_review`.
      const { error } = await window.SupabaseClient.from('flashcards').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar flashcard no Supabase:', error);
    }
  }
}
