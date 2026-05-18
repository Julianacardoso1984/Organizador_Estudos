'use strict';

/**
 * QuizModel — Gerencia as sessões de Quizzes e Simulados gerados por I.A.
 */
class QuizModel {
  constructor() {
    const raw = localStorage.getItem('quizzes');
    if (raw === null) {
      this.quizzes = [];
      this._seed();
    } else {
      try {
        this.quizzes = JSON.parse(raw) || [];
      } catch (e) {
        this.quizzes = [];
      }
    }
  }

  getAll() { return [...this.quizzes]; }

  getBySubject(subjectId) {
    return this.quizzes.filter(q => q.subjectId === subjectId);
  }

  getById(id) {
    return this.quizzes.find(q => q.id === id) || null;
  }

  create(subjectId, title, questions) {
    const quiz = {
      id: _uuid(),
      subjectId,
      title: title.trim(),
      questions, // Array de: { question, options:[], answerIndex, explanation }
      score: null, // Guardará a pontuação final (ex: 80 para 80% de acertos)
      completedAt: null,
      createdAt: new Date().toISOString()
    };
    this.quizzes.push(quiz);
    this._save();
    EventBus.emit('quizzes:updated', this.getAll());
    return quiz;
  }

  saveScore(id, score) {
    const quiz = this.getById(id);
    if (!quiz) return;
    quiz.score = score;
    quiz.completedAt = new Date().toISOString();
    this._save();
    EventBus.emit('quizzes:updated', this.getAll());
  }

  delete(id) {
    this.quizzes = this.quizzes.filter(q => q.id !== id);
    this._save();
    EventBus.emit('quizzes:updated', this.getAll());
  }

  _seed() {
    this.quizzes = [
      {
        id: 'qz1',
        subjectId: 's1', // Geralmente primeiro subject cadastrado
        title: 'Simulado Rápido: Fundamentos de Web Development',
        questions: [
          {
            question: 'Qual tag HTML5 define a estrutura principal do cabeçalho da página?',
            options: ['<header>', '<body>', '<head>', '<h1>'],
            answerIndex: 0,
            explanation: 'A tag <header> define o cabeçalho estrutural de um documento, página ou seção, contendo tipicamente logos, menus ou títulos principais.'
          },
          {
            question: 'Qual propriedade CSS é utilizada para alterar a cor do texto de um elemento?',
            options: ['background-color', 'font-color', 'color', 'text-color'],
            answerIndex: 2,
            explanation: 'A propriedade color altera a cor do texto (foreground), enquanto background-color altera o fundo.'
          },
          {
            question: 'O que o método Array.prototype.map() faz no JavaScript?',
            options: [
              'Filtra os elementos do array com base em um teste lógico.',
              'Cria um novo array com os resultados da aplicação de uma função em cada elemento do array original.',
              'Encontra o primeiro elemento que satisfaz a condição de teste.',
              'Ordena os elementos de forma crescente.'
            ],
            answerIndex: 1,
            explanation: 'O método map() invoca uma função de callback em cada item do array e retorna um novo array contendo os resultados transformados.'
          }
        ],
        score: null,
        completedAt: null,
        createdAt: new Date().toISOString()
      }
    ];
    this._save();
  }

  _save() { Storage.set('quizzes', this.quizzes); }
}
