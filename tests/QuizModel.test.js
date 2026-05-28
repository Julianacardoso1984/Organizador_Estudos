'use strict';

/**
 * QuizModel unit tests
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter } = require('./helpers/mocks');

const quizModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/QuizModel.js'),
  'utf8'
);

function buildQuizModel(lsMock, eventBusMock) {
  resetUuidCounter();
  const storageMock = createStorageMock(lsMock);
  const fn = new Function('Storage', 'EventBus', '_uuid', 'localStorage', quizModelSrc + '\nreturn QuizModel;');
  return { model: new (fn(storageMock, eventBusMock, mockUuid, lsMock))(), storageMock };
}

const sampleQuestions = [
  { question: 'Q1?', options: ['A', 'B'], answerIndex: 0, explanation: 'Exp 1' },
  { question: 'Q2?', options: ['C', 'D'], answerIndex: 1, explanation: 'Exp 2' },
];

describe('QuizModel', () => {
  let lsMock, eventBusMock;

  beforeEach(() => {
    lsMock       = createLocalStorageMock();
    eventBusMock = createEventBusMock();
  });

  // ── Constructor / seeding ─────────────────────────────────────────────────

  test('seeds 1 default quiz when localStorage is empty', () => {
    const { model } = buildQuizModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(1);
    expect(model.getAll()[0].title).toContain('Fundamentos de Web Development');
  });

  test('loads existing quizzes when localStorage has data', () => {
    const existing = [{ id: 'q1', subjectId: 's1', title: 'My Quiz', questions: [], score: null, completedAt: null, createdAt: '' }];
    lsMock.setItem('quizzes', JSON.stringify(existing));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(1);
    expect(model.getAll()[0].title).toBe('My Quiz');
  });

  test('handles corrupted localStorage gracefully', () => {
    lsMock.setItem('quizzes', '{invalid}');
    const { model } = buildQuizModel(lsMock, eventBusMock);
    expect(model.getAll()).toEqual([]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  test('create() returns quiz with correct structure', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', '  Science Quiz  ', sampleQuestions);
    expect(quiz.title).toBe('Science Quiz');  // trimmed
    expect(quiz.subjectId).toBe('s1');
    expect(quiz.questions).toEqual(sampleQuestions);
    expect(quiz.score).toBeNull();
    expect(quiz.completedAt).toBeNull();
    expect(quiz.createdAt).toBeTruthy();
  });

  test('create() persists and emits quizzes:updated', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model, storageMock } = buildQuizModel(lsMock, eventBusMock);
    model.create('s1', 'Q', sampleQuestions);
    expect(storageMock.set).toHaveBeenCalledWith('quizzes', expect.any(Array));
    expect(eventBusMock.emit).toHaveBeenCalledWith('quizzes:updated', expect.any(Array));
  });

  // ── getById / getBySubject ────────────────────────────────────────────────

  test('getById() returns the correct quiz', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Find Me', sampleQuestions);
    expect(model.getById(quiz.id)).toEqual(quiz);
  });

  test('getById() returns null for unknown id', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    expect(model.getById('ghost')).toBeNull();
  });

  test('getBySubject() filters by subjectId', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    model.create('s1', 'Q1', sampleQuestions);
    model.create('s2', 'Q2', sampleQuestions);
    model.create('s1', 'Q3', sampleQuestions);
    expect(model.getBySubject('s1')).toHaveLength(2);
    expect(model.getBySubject('s2')).toHaveLength(1);
    expect(model.getBySubject('s3')).toHaveLength(0);
  });

  test('getAll() returns defensive copy', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    model.create('s1', 'Q', sampleQuestions);
    const all = model.getAll();
    all.push({ fake: true });
    expect(model.getAll()).toHaveLength(1);
  });

  // ── saveScore ─────────────────────────────────────────────────────────────

  test('saveScore() sets score and completedAt', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Q', sampleQuestions);
    model.saveScore(quiz.id, 80);
    const updated = model.getById(quiz.id);
    expect(updated.score).toBe(80);
    expect(updated.completedAt).not.toBeNull();
  });

  test('saveScore() works for score 0 (all wrong)', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Q', sampleQuestions);
    model.saveScore(quiz.id, 0);
    expect(model.getById(quiz.id).score).toBe(0);
  });

  test('saveScore() for unknown id is a no-op', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    expect(() => model.saveScore('ghost', 100)).not.toThrow();
  });

  test('saveScore() persists and emits quizzes:updated', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model, storageMock } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Q', sampleQuestions);
    eventBusMock.emit.mockClear();
    storageMock.set.mockClear();
    model.saveScore(quiz.id, 75);
    expect(storageMock.set).toHaveBeenCalled();
    expect(eventBusMock.emit).toHaveBeenCalledWith('quizzes:updated', expect.any(Array));
  });

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete() removes the quiz', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Delete me', sampleQuestions);
    model.delete(quiz.id);
    expect(model.getById(quiz.id)).toBeNull();
    expect(model.getAll()).toHaveLength(0);
  });

  test('delete() emits quizzes:updated', () => {
    lsMock.setItem('quizzes', JSON.stringify([]));
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const quiz = model.create('s1', 'Q', sampleQuestions);
    eventBusMock.emit.mockClear();
    model.delete(quiz.id);
    expect(eventBusMock.emit).toHaveBeenCalledWith('quizzes:updated', expect.any(Array));
  });

  // ── Seed data integrity ───────────────────────────────────────────────────

  test('seeded quiz has 3 questions with valid answerIndex', () => {
    const { model } = buildQuizModel(lsMock, eventBusMock);
    const seed = model.getAll()[0];
    expect(seed.questions).toHaveLength(3);
    seed.questions.forEach(q => {
      expect(typeof q.answerIndex).toBe('number');
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
    });
  });
});
