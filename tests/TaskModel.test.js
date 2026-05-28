'use strict';

/**
 * TaskModel unit tests
 *
 * Strategy: We set up globals that TaskModel depends on (Storage, EventBus, _uuid)
 * and then eval() the source so we can test the class in isolation from the browser.
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter } = require('./helpers/mocks');

// ── Load TaskModel source ──────────────────────────────────────────────────────
const taskModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/TaskModel.js'),
  'utf8'
);

function buildTaskModel(storageMock, eventBusMock) {
  resetUuidCounter();
  // Execute source in a fresh scope with our injected globals
  const fn = new Function('Storage', 'EventBus', '_uuid', taskModelSrc + '\nreturn TaskModel;');
  const TaskModelClass = fn(storageMock, eventBusMock, mockUuid);
  return new TaskModelClass();
}

describe('TaskModel', () => {
  let lsMock, storageMock, eventBusMock, model;

  beforeEach(() => {
    lsMock       = createLocalStorageMock();
    storageMock  = createStorageMock(lsMock);
    eventBusMock = createEventBusMock();
    model        = buildTaskModel(storageMock, eventBusMock);
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  test('starts with empty tasks when Storage returns null', () => {
    expect(model.getAll()).toEqual([]);
  });

  test('loads existing tasks from Storage on construction', () => {
    const existing = [{ id: 'abc', title: 'Pre-existing', status: 'todo', subjectId: 's1' }];
    lsMock.setItem('tasks', JSON.stringify(existing));
    const storageMock2 = createStorageMock(lsMock);
    const model2 = buildTaskModel(storageMock2, eventBusMock);
    expect(model2.getAll()).toHaveLength(1);
    expect(model2.getAll()[0].title).toBe('Pre-existing');
  });

  // ── create ────────────────────────────────────────────────────────────────

  test('create() returns task with correct defaults', () => {
    const task = model.create('s1', '  Study Math  ');
    expect(task.id).toBe('mock-uuid-1');
    expect(task.title).toBe('Study Math');       // trimmed
    expect(task.status).toBe('todo');
    expect(task.priority).toBe('medium');
    expect(task.subjectId).toBe('s1');
    expect(task.dueDate).toBeNull();
    expect(task.description).toBe('');
  });

  test('create() accepts custom opts', () => {
    const task = model.create('s2', 'Lab report', {
      description: 'Write it up',
      priority: 'high',
      dueDate: '2025-12-31'
    });
    expect(task.description).toBe('Write it up');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe('2025-12-31');
  });

  test('create() persists to Storage', () => {
    model.create('s1', 'Save me');
    expect(storageMock.set).toHaveBeenCalledWith('tasks', expect.arrayContaining([
      expect.objectContaining({ title: 'Save me' })
    ]));
  });

  test('create() emits tasks:updated', () => {
    model.create('s1', 'Event test');
    expect(eventBusMock.emit).toHaveBeenCalledWith('tasks:updated', expect.any(Array));
  });

  test('create() emits task:withDue when dueDate is provided', () => {
    model.create('s1', 'Due task', { dueDate: '2025-06-01' });
    expect(eventBusMock.emit).toHaveBeenCalledWith('task:withDue', expect.objectContaining({ dueDate: '2025-06-01' }));
  });

  test('create() does NOT emit task:withDue when no dueDate', () => {
    model.create('s1', 'No due');
    const emitCalls = eventBusMock.emit.mock.calls.map(([evt]) => evt);
    expect(emitCalls).not.toContain('task:withDue');
  });

  // ── getAll / getById / getBySubject ───────────────────────────────────────

  test('getAll() returns a copy — mutations do not affect internal state', () => {
    model.create('s1', 'Task A');
    const all = model.getAll();
    all.push({ fake: true });
    expect(model.getAll()).toHaveLength(1);
  });

  test('getById() returns the correct task', () => {
    const task = model.create('s1', 'Find me');
    expect(model.getById(task.id)).toEqual(task);
  });

  test('getById() returns null for unknown id', () => {
    expect(model.getById('nonexistent')).toBeNull();
  });

  test('getBySubject() filters by subjectId', () => {
    model.create('s1', 'Task A');
    model.create('s2', 'Task B');
    model.create('s1', 'Task C');
    const result = model.getBySubject('s1');
    expect(result).toHaveLength(2);
    result.forEach(t => expect(t.subjectId).toBe('s1'));
  });

  // ── getPending / getOverdue ───────────────────────────────────────────────

  test('getPending() excludes tasks with status === "done"', () => {
    model.create('s1', 'Todo task');
    const doingTask = model.create('s1', 'Doing task');
    model.setStatus(doingTask.id, 'doing');
    const doneTask = model.create('s1', 'Done task');
    model.setStatus(doneTask.id, 'done');

    const pending = model.getPending();
    expect(pending).toHaveLength(2);
    pending.forEach(t => expect(t.status).not.toBe('done'));
  });

  test('getOverdue() returns only past-due non-done tasks', () => {
    model.create('s1', 'Past due',    { dueDate: '2000-01-01' });
    model.create('s1', 'Future task', { dueDate: '2099-12-31' });
    model.create('s1', 'No date' );

    const overdue = model.getOverdue();
    expect(overdue).toHaveLength(1);
    expect(overdue[0].dueDate).toBe('2000-01-01');
  });

  test('getOverdue() does not include done tasks even if past due', () => {
    const task = model.create('s1', 'Past done', { dueDate: '2000-01-01' });
    model.setStatus(task.id, 'done');
    expect(model.getOverdue()).toHaveLength(0);
  });

  // ── update ────────────────────────────────────────────────────────────────

  test('update() modifies task fields', () => {
    const task = model.create('s1', 'Original');
    const updated = model.update(task.id, { title: 'Changed', priority: 'low' });
    expect(updated.title).toBe('Changed');
    expect(updated.priority).toBe('low');
    expect(updated.status).toBe('todo');   // unchanged fields preserved
  });

  test('update() returns null for unknown id', () => {
    expect(model.update('ghost', { title: 'X' })).toBeNull();
  });

  test('update() emits tasks:updated', () => {
    const task = model.create('s1', 'T');
    eventBusMock.emit.mockClear();
    model.update(task.id, { title: 'New' });
    expect(eventBusMock.emit).toHaveBeenCalledWith('tasks:updated', expect.any(Array));
  });

  // ── setStatus ─────────────────────────────────────────────────────────────

  test('setStatus() updates status field', () => {
    const task = model.create('s1', 'Task');
    model.setStatus(task.id, 'doing');
    expect(model.getById(task.id).status).toBe('doing');
  });

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete() removes the task', () => {
    const task = model.create('s1', 'Delete me');
    model.delete(task.id);
    expect(model.getById(task.id)).toBeNull();
    expect(model.getAll()).toHaveLength(0);
  });

  test('delete() emits tasks:updated', () => {
    const task = model.create('s1', 'T');
    eventBusMock.emit.mockClear();
    model.delete(task.id);
    expect(eventBusMock.emit).toHaveBeenCalledWith('tasks:updated', expect.any(Array));
  });

  // ── deleteBySubject ───────────────────────────────────────────────────────

  test('deleteBySubject() removes only matching subject tasks', () => {
    model.create('s1', 'A');
    model.create('s1', 'B');
    model.create('s2', 'C');
    model.deleteBySubject('s1');
    const remaining = model.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].subjectId).toBe('s2');
  });

  // ── stats ─────────────────────────────────────────────────────────────────

  test('stats() returns correct counts', () => {
    const t1 = model.create('s1', 'T1');
    const t2 = model.create('s1', 'T2');
    const t3 = model.create('s1', 'T3');
    model.setStatus(t2.id, 'doing');
    model.setStatus(t3.id, 'done');

    expect(model.stats()).toEqual({ total: 3, todo: 1, doing: 1, done: 1 });
  });

  test('stats() returns zeros when no tasks', () => {
    expect(model.stats()).toEqual({ total: 0, todo: 0, doing: 0, done: 0 });
  });
});
