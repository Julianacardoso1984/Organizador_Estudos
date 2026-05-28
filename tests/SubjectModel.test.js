'use strict';

/**
 * SubjectModel unit tests
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter } = require('./helpers/mocks');

const subjectModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/SubjectModel.js'),
  'utf8'
);

// SubjectModel.js also defines the global _uuid function — we provide our own.
function buildSubjectModel(lsMock, eventBusMock) {
  resetUuidCounter();
  const storageMock = createStorageMock(lsMock);
  // SubjectModel accesses localStorage directly, so inject it via the function scope
  const fn = new Function('Storage', 'EventBus', '_uuid', 'localStorage', subjectModelSrc + '\nreturn SubjectModel;');
  return { model: new (fn(storageMock, eventBusMock, mockUuid, lsMock))(), storageMock };
}

describe('SubjectModel', () => {
  let lsMock, eventBusMock;

  beforeEach(() => {
    lsMock       = createLocalStorageMock();
    eventBusMock = createEventBusMock();
  });

  // ── Constructor / seeding ─────────────────────────────────────────────────

  test('seeds 3 default subjects when localStorage is empty', () => {
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(3);
    const names = model.getAll().map(s => s.name);
    expect(names).toContain('Matemática');
    expect(names).toContain('História');
    expect(names).toContain('Biologia');
  });

  test('loads existing subjects when localStorage has data', () => {
    const existing = [{ id: 'x1', name: 'Física', emoji: '⚛️', color: '#f00', createdAt: new Date().toISOString() }];
    lsMock.setItem('subjects', JSON.stringify(existing));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    expect(model.getAll()).toHaveLength(1);
    expect(model.getAll()[0].name).toBe('Física');
  });

  test('handles corrupted localStorage gracefully (falls back to empty)', () => {
    lsMock.setItem('subjects', 'INVALID_JSON{{{{');
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    // Corrupted JSON → empty array (no seed since raw !== null)
    expect(model.getAll()).toEqual([]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  test('create() adds a subject with correct defaults', () => {
    // Start fresh with no existing subjects (set empty array to skip seed)
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('  Química  ');
    expect(sub.name).toBe('Química');      // trimmed
    expect(sub.emoji).toBe('📚');
    expect(sub.color).toBe('#8B5CF6');
    expect(sub.id).toBeTruthy();
    expect(sub.createdAt).toBeTruthy();
  });

  test('create() accepts custom emoji and color', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('Física', '⚛️', '#ff0000');
    expect(sub.emoji).toBe('⚛️');
    expect(sub.color).toBe('#ff0000');
  });

  test('create() persists to storage', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model, storageMock } = buildSubjectModel(lsMock, eventBusMock);
    model.create('Física');
    expect(storageMock.set).toHaveBeenCalledWith('subjects', expect.arrayContaining([
      expect.objectContaining({ name: 'Física' })
    ]));
  });

  test('create() emits subjects:updated', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    eventBusMock.emit.mockClear();
    model.create('Física');
    expect(eventBusMock.emit).toHaveBeenCalledWith('subjects:updated', expect.any(Array));
  });

  // ── getById ───────────────────────────────────────────────────────────────

  test('getById() finds the correct subject', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('Geo');
    expect(model.getById(sub.id)).toEqual(sub);
  });

  test('getById() returns null for unknown id', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    expect(model.getById('ghost')).toBeNull();
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  test('getAll() returns a defensive copy', () => {
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const all = model.getAll();
    const originalLen = all.length;
    all.push({ fake: true });
    expect(model.getAll()).toHaveLength(originalLen);
  });

  // ── update ────────────────────────────────────────────────────────────────

  test('update() patches subject fields', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('Old name');
    const updated = model.update(sub.id, { name: 'New name', color: '#abc' });
    expect(updated.name).toBe('New name');
    expect(updated.color).toBe('#abc');
    expect(updated.emoji).toBe('📚'); // unchanged
  });

  test('update() returns null for unknown id', () => {
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    expect(model.update('ghost', { name: 'X' })).toBeNull();
  });

  test('update() emits subjects:updated', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('S');
    eventBusMock.emit.mockClear();
    model.update(sub.id, { name: 'S2' });
    expect(eventBusMock.emit).toHaveBeenCalledWith('subjects:updated', expect.any(Array));
  });

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete() removes subject from list', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('Deletable');
    model.delete(sub.id);
    expect(model.getById(sub.id)).toBeNull();
    expect(model.getAll()).toHaveLength(0);
  });

  test('delete() emits both subjects:updated and subject:deleted', () => {
    lsMock.setItem('subjects', JSON.stringify([]));
    const { model } = buildSubjectModel(lsMock, eventBusMock);
    const sub = model.create('Gone');
    eventBusMock.emit.mockClear();
    model.delete(sub.id);
    const emittedEvents = eventBusMock.emit.mock.calls.map(([e]) => e);
    expect(emittedEvents).toContain('subjects:updated');
    expect(emittedEvents).toContain('subject:deleted');
    expect(eventBusMock.emit).toHaveBeenCalledWith('subject:deleted', sub.id);
  });
});
