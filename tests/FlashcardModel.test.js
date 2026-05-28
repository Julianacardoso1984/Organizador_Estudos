'use strict';

/**
 * FlashcardModel unit tests
 *
 * Focused on the Leitner box algorithm, scoring logic, and CRUD behaviour.
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter } = require('./helpers/mocks');

const flashcardModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/FlashcardModel.js'),
  'utf8'
);

function buildFlashcardModel(lsMock, eventBusMock) {
  resetUuidCounter();
  const storageMock = createStorageMock(lsMock);
  const fn = new Function('Storage', 'EventBus', '_uuid', 'localStorage', flashcardModelSrc + '\nreturn FlashcardModel;');
  return { model: new (fn(storageMock, eventBusMock, mockUuid, lsMock))(), storageMock };
}

// Helper — get today's ISO date string
const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('FlashcardModel', () => {
  let lsMock, eventBusMock;

  beforeEach(() => {
    lsMock       = createLocalStorageMock();
    eventBusMock = createEventBusMock();
  });

  // ── Constructor / seeding ─────────────────────────────────────────────────

  test('seeds 2 default flashcards when localStorage is empty', () => {
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(2);
  });

  test('loads existing flashcards when localStorage has data', () => {
    const existing = [{ id: 'fc-existing', subjectId: 's1', front: 'Q?', back: 'A!', box: 1, nextReviewDate: today(), createdAt: new Date().toISOString() }];
    lsMock.setItem('flashcards', JSON.stringify(existing));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(1);
  });

  test('handles corrupted localStorage gracefully', () => {
    lsMock.setItem('flashcards', '<<<CORRUPT>>>');
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    expect(model.getAll()).toEqual([]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  test('create() starts card in box 1 with today as nextReviewDate', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', '  What is JS?  ', '  A language.  ');
    expect(card.box).toBe(1);
    expect(card.front).toBe('What is JS?');   // trimmed
    expect(card.back).toBe('A language.');     // trimmed
    expect(card.nextReviewDate).toBe(today());
    expect(card.subjectId).toBe('s1');
  });

  test('create() persists and emits flashcards:updated', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model, storageMock } = buildFlashcardModel(lsMock, eventBusMock);
    model.create('s1', 'Q', 'A');
    expect(storageMock.set).toHaveBeenCalledWith('flashcards', expect.any(Array));
    expect(eventBusMock.emit).toHaveBeenCalledWith('flashcards:updated', expect.any(Array));
  });

  // ── getBySubject / getDueBySubject ────────────────────────────────────────

  test('getBySubject() filters correctly', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    model.create('s1', 'Q1', 'A1');
    model.create('s2', 'Q2', 'A2');
    model.create('s1', 'Q3', 'A3');
    expect(model.getBySubject('s1')).toHaveLength(2);
    expect(model.getBySubject('s2')).toHaveLength(1);
  });

  test('getDueBySubject() returns only cards whose nextReviewDate <= today', () => {
    const pastCard   = { id: 'c1', subjectId: 's1', front: 'P', back: 'B', box: 1, nextReviewDate: '2000-01-01', createdAt: '' };
    const todayCard  = { id: 'c2', subjectId: 's1', front: 'T', back: 'B', box: 1, nextReviewDate: today(),       createdAt: '' };
    const futureCard = { id: 'c3', subjectId: 's1', front: 'F', back: 'B', box: 1, nextReviewDate: '2099-12-31', createdAt: '' };
    lsMock.setItem('flashcards', JSON.stringify([pastCard, todayCard, futureCard]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const due = model.getDueBySubject('s1');
    expect(due).toHaveLength(2);
    expect(due.map(c => c.id)).not.toContain('c3');
  });

  // ── getById ───────────────────────────────────────────────────────────────

  test('getById() finds the correct card', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', 'Q', 'A');
    expect(model.getById(card.id)).toEqual(card);
  });

  test('getById() returns null for unknown id', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    expect(model.getById('nonexistent')).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete() removes the card', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', 'Q', 'A');
    model.delete(card.id);
    expect(model.getById(card.id)).toBeNull();
    expect(model.getAll()).toHaveLength(0);
  });

  test('delete() emits flashcards:updated', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', 'Q', 'A');
    eventBusMock.emit.mockClear();
    model.delete(card.id);
    expect(eventBusMock.emit).toHaveBeenCalledWith('flashcards:updated', expect.any(Array));
  });

  // ── score() — Leitner algorithm ───────────────────────────────────────────

  test('score(id, true) advances box by 1', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', 'Q', 'A'); // box: 1
    model.score(card.id, true);
    expect(model.getById(card.id).box).toBe(2);
  });

  test('score(id, false) resets box to 1 regardless of current box', () => {
    const highCard = { id: 'hc1', subjectId: 's1', front: 'Q', back: 'A', box: 4, nextReviewDate: today(), createdAt: '' };
    lsMock.setItem('flashcards', JSON.stringify([highCard]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    model.score('hc1', false);
    expect(model.getById('hc1').box).toBe(1);
  });

  test('score(id, true) does not advance beyond box 5', () => {
    const maxCard = { id: 'mc1', subjectId: 's1', front: 'Q', back: 'A', box: 5, nextReviewDate: today(), createdAt: '' };
    lsMock.setItem('flashcards', JSON.stringify([maxCard]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    model.score('mc1', true);
    expect(model.getById('mc1').box).toBe(5); // capped
  });

  test.each([
    [1, false, 1],  // wrong → box 1, interval 1 day
    [1, true,  2],  // correct from box 1 → box 2, interval 2 days
    [2, true,  4],  // box 2 → box 3, interval 4 days
    [3, true,  7],  // box 3 → box 4, interval 7 days
    [4, true, 14],  // box 4 → box 5, interval 14 days
  ])('box %i + correct=%s → nextReviewDate in %i days', (startBox, correct, expectedDays) => {
    const card = { id: 't1', subjectId: 's1', front: 'Q', back: 'A', box: startBox, nextReviewDate: today(), createdAt: '' };
    lsMock.setItem('flashcards', JSON.stringify([card]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    model.score('t1', correct);
    const updatedCard = model.getById('t1');
    expect(updatedCard.nextReviewDate).toBe(daysFromNow(expectedDays));
  });

  test('score() on unknown id is a no-op (does not throw)', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    expect(() => model.score('ghost', true)).not.toThrow();
  });

  test('score() emits flashcards:updated', () => {
    lsMock.setItem('flashcards', JSON.stringify([]));
    const { model } = buildFlashcardModel(lsMock, eventBusMock);
    const card = model.create('s1', 'Q', 'A');
    eventBusMock.emit.mockClear();
    model.score(card.id, true);
    expect(eventBusMock.emit).toHaveBeenCalledWith('flashcards:updated', expect.any(Array));
  });
});
