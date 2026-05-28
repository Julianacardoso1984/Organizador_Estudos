'use strict';

/**
 * CalendarModel unit tests
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter } = require('./helpers/mocks');

const calendarModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/CalendarModel.js'),
  'utf8'
);

function buildCalendarModel(lsMock, eventBusMock) {
  resetUuidCounter();
  const storageMock = createStorageMock(lsMock);
  const fn = new Function('Storage', 'EventBus', '_uuid', calendarModelSrc + '\nreturn CalendarModel;');
  return { model: new (fn(storageMock, eventBusMock, mockUuid))(), storageMock };
}

const today = () => new Date().toISOString().slice(0, 10);
const dayOffset = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('CalendarModel', () => {
  let lsMock, eventBusMock;

  beforeEach(() => {
    lsMock       = createLocalStorageMock();
    eventBusMock = createEventBusMock();
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  test('starts with empty events when Storage returns null', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    expect(model.getAll()).toEqual([]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  test('create() returns event with correct defaults', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const event = model.create({ title: '  Study  ', date: '2025-06-01' });
    expect(event.title).toBe('Study');         // trimmed
    expect(event.type).toBe('study');
    expect(event.color).toBe('#8B5CF6');
    expect(event.duration).toBe(60);
    expect(event.notes).toBe('');
    expect(event.subjectId).toBeNull();
  });

  test('create() accepts custom fields', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const event = model.create({
      title: 'Exam',
      date: '2025-06-15',
      subjectId: 's1',
      type: 'exam',
      color: '#f00',
      duration: 120,
      notes: 'Bring pencil'
    });
    expect(event.type).toBe('exam');
    expect(event.duration).toBe(120);
    expect(event.notes).toBe('Bring pencil');
    expect(event.subjectId).toBe('s1');
  });

  test('create() persists and emits calendar:updated', () => {
    const { model, storageMock } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'T', date: '2025-06-01' });
    expect(storageMock.set).toHaveBeenCalledWith('calendarEvents', expect.any(Array));
    expect(eventBusMock.emit).toHaveBeenCalledWith('calendar:updated', expect.any(Array));
  });

  // ── getByDate ─────────────────────────────────────────────────────────────

  test('getByDate() returns only events for the given date', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'A', date: '2025-06-01' });
    model.create({ title: 'B', date: '2025-06-01' });
    model.create({ title: 'C', date: '2025-06-02' });
    expect(model.getByDate('2025-06-01')).toHaveLength(2);
    expect(model.getByDate('2025-06-02')).toHaveLength(1);
    expect(model.getByDate('2025-06-03')).toHaveLength(0);
  });

  // ── getByMonth ────────────────────────────────────────────────────────────

  test('getByMonth() returns events matching year-month prefix', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'Jan1', date: '2025-01-10' });
    model.create({ title: 'Jan2', date: '2025-01-20' });
    model.create({ title: 'Feb1', date: '2025-02-05' });
    const jan = model.getByMonth(2025, 1);
    expect(jan).toHaveLength(2);
    jan.forEach(e => expect(e.date.startsWith('2025-01')).toBe(true));
  });

  test('getByMonth() pads single-digit months correctly', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'March', date: '2025-03-15' });
    expect(model.getByMonth(2025, 3)).toHaveLength(1);
  });

  // ── getById ───────────────────────────────────────────────────────────────

  test('getById() returns the correct event', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const event = model.create({ title: 'Find me', date: '2025-06-10' });
    expect(model.getById(event.id)).toEqual(event);
  });

  test('getById() returns null for unknown id', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    expect(model.getById('ghost')).toBeNull();
  });

  // ── update ────────────────────────────────────────────────────────────────

  test('update() patches event fields and preserves others', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const event = model.create({ title: 'Old', date: '2025-06-01' });
    const updated = model.update(event.id, { title: 'New', duration: 90 });
    expect(updated.title).toBe('New');
    expect(updated.duration).toBe(90);
    expect(updated.date).toBe('2025-06-01');  // unchanged
  });

  test('update() returns null for unknown id', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    expect(model.update('ghost', { title: 'X' })).toBeNull();
  });

  // ── delete ────────────────────────────────────────────────────────────────

  test('delete() removes the event', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const event = model.create({ title: 'Remove', date: '2025-06-01' });
    model.delete(event.id);
    expect(model.getById(event.id)).toBeNull();
    expect(model.getAll()).toHaveLength(0);
  });

  // ── createFromTask ────────────────────────────────────────────────────────

  test('createFromTask() creates a deadline event from a task', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const task = { id: 'task1', title: 'Homework', dueDate: '2025-07-01', subjectId: 's1', description: 'Do it' };
    model.createFromTask(task, '#abc');
    const events = model.getAll();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('deadline');
    expect(events[0].date).toBe('2025-07-01');
    expect(events[0].taskId).toBe('task1');
    expect(events[0].title).toContain('Homework');
  });

  test('createFromTask() skips when dueDate is absent', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.createFromTask({ id: 'task2', title: 'No date', dueDate: null, subjectId: 's1' }, '#abc');
    expect(model.getAll()).toHaveLength(0);
  });

  test('createFromTask() prevents duplicate events for the same task', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    const task = { id: 'task3', title: 'Dup', dueDate: '2025-07-15', subjectId: 's1' };
    model.createFromTask(task, '#abc');
    model.createFromTask(task, '#abc'); // second call should be ignored
    expect(model.getAll()).toHaveLength(1);
  });

  // ── getUpcoming ───────────────────────────────────────────────────────────

  test('getUpcoming() returns events within next 7 days sorted by date', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'Yesterday', date: dayOffset(-1) });
    model.create({ title: 'Today',     date: today() });
    model.create({ title: 'In 3 days', date: dayOffset(3) });
    model.create({ title: 'In 7 days', date: dayOffset(7) });
    model.create({ title: 'In 8 days', date: dayOffset(8) });

    const upcoming = model.getUpcoming(7);
    const titles = upcoming.map(e => e.title);
    expect(titles).toContain('Today');
    expect(titles).toContain('In 3 days');
    expect(titles).toContain('In 7 days');
    expect(titles).not.toContain('Yesterday');
    expect(titles).not.toContain('In 8 days');
  });

  test('getUpcoming() returns events in ascending date order', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'C', date: dayOffset(3) });
    model.create({ title: 'A', date: today() });
    model.create({ title: 'B', date: dayOffset(1) });
    const upcoming = model.getUpcoming();
    expect(upcoming[0].title).toBe('A');
    expect(upcoming[1].title).toBe('B');
    expect(upcoming[2].title).toBe('C');
  });

  test('getUpcoming() accepts custom days parameter', () => {
    const { model } = buildCalendarModel(lsMock, eventBusMock);
    model.create({ title: 'Day1', date: dayOffset(1) });
    model.create({ title: 'Day3', date: dayOffset(3) });
    expect(model.getUpcoming(2)).toHaveLength(1);
    expect(model.getUpcoming(2)[0].title).toBe('Day1');
  });
});
