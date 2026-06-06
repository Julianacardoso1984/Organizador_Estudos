'use strict';

/**
 * QuizModel — Gerencia as sessões de Quizzes e Simulados gerados por I.A.
 */
class QuizModel {
  constructor() {
    this.quizzes = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar quizzes:', error);
    } else {
      this.quizzes = data || [];
      this.quizzes.forEach(q => {
        q.subjectId = q.subject_id;
        q.completedAt = q.completed_at;
        q.createdAt = q.created_at;
      });
    }
  }

  getAll() { return [...this.quizzes]; }

  getBySubject(subjectId) {
    return this.quizzes.filter(q => q.subjectId === subjectId);
  }

  getById(id) {
    return this.quizzes.find(q => q.id === id) || null;
  }

  async create(subjectId, title, questions) {
    const quiz = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      title: title.trim(),
      questions, // Array de: { question, options:[], answerIndex, explanation }
      score: null, // Guardará a pontuação final (ex: 80 para 80% de acertos)
      completed_at: null,
      created_at: new Date().toISOString()
    };
    
    const localQuiz = { ...quiz, subjectId: quiz.subject_id, completedAt: quiz.completed_at, createdAt: quiz.created_at };
    this.quizzes.push(localQuiz);
    EventBus.emit('quizzes:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('quizzes').insert(quiz);
      if (error) console.error('Erro ao salvar quiz no Supabase:', error);
    }
    return localQuiz;
  }

  async saveScore(id, score) {
    const quiz = this.getById(id);
    if (!quiz) return;
    
    const now = new Date().toISOString();
    quiz.score = score;
    quiz.completedAt = now;
    EventBus.emit('quizzes:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { score, completed_at: now };
      const { error } = await window.SupabaseClient.from('quizzes').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao salvar score do quiz no Supabase:', error);
    }
  }

  async delete(id) {
    this.quizzes = this.quizzes.filter(q => q.id !== id);
    EventBus.emit('quizzes:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('quizzes').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar quiz no Supabase:', error);
    }
  }
}
