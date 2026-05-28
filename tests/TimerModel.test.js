'use strict';

/**
 * TimerModel unit tests
 *
 * Uses fake timers (jest.useFakeTimers) to control setInterval without real waiting.
 */

const fs   = require('fs');
const path = require('path');
const { createLocalStorageMock, createEventBusMock, createStorageMock, resetUuidCounter } = require('./helpers/mocks');

const timerModelSrc = fs.readFileSync(
  path.resolve(__dirname, '../js/models/TimerModel.js'),
  'utf8'
);

function buildTimerModel(storageMock, eventBusMock) {
  resetUuidCounter();
  const fn = new Function('Storage', 'EventBus', timerModelSrc + '\nreturn TimerModel;');
  return new (fn(storageMock, eventBusMock))();
}

// Stub AudioContext so _playSound() does not throw in Node
global.window = {
  AudioContext:       undefined,
  webkitAudioContext: undefined,
};

describe('TimerModel', () => {
  let lsMock, storageMock, eventBusMock, model;

  beforeEach(() => {
    jest.useFakeTimers();
    lsMock       = createLocalStorageMock();
    storageMock  = createStorageMock(lsMock);
    eventBusMock = createEventBusMock();
    model        = buildTimerModel(storageMock, eventBusMock);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Constructor ───────────────────────────────────────────────────────────

  test('starts in focus mode with 25-minute default', () => {
    expect(model.mode).toBe('focus');
    expect(model.remaining).toBe(25 * 60);
    expect(model.running).toBe(false);
  });

  test('respects saved pomodoroFocusTime from Storage', () => {
    lsMock.setItem('pomodoroFocusTime', JSON.stringify(45));
    const storageMock2 = createStorageMock(lsMock);
    const model2 = buildTimerModel(storageMock2, eventBusMock);
    expect(model2.MODES.focus.duration).toBe(45 * 60);
    expect(model2.remaining).toBe(45 * 60);
  });

  test('restores session count from pomodoroStats', () => {
    lsMock.setItem('pomodoroStats', JSON.stringify({ session: 7 }));
    const storageMock2 = createStorageMock(lsMock);
    const model2 = buildTimerModel(storageMock2, eventBusMock);
    expect(model2.session).toBe(7);
  });

  // ── getCurrentMode ────────────────────────────────────────────────────────

  test('getCurrentMode() returns focus mode object', () => {
    const current = model.getCurrentMode();
    expect(current.label).toBe('Foco');
    expect(current.duration).toBe(25 * 60);
  });

  // ── setMode ───────────────────────────────────────────────────────────────

  test('setMode("shortBreak") sets remaining to 5 min', () => {
    model.setMode('shortBreak');
    expect(model.mode).toBe('shortBreak');
    expect(model.remaining).toBe(5 * 60);
  });

  test('setMode("longBreak") sets remaining to 15 min', () => {
    model.setMode('longBreak');
    expect(model.remaining).toBe(15 * 60);
  });

  test('setMode() with invalid mode is a no-op', () => {
    model.setMode('ultraMode');
    expect(model.mode).toBe('focus');        // unchanged
    expect(model.remaining).toBe(25 * 60);  // unchanged
  });

  test('setMode() emits timer:tick', () => {
    model.setMode('shortBreak');
    expect(eventBusMock.emit).toHaveBeenCalledWith('timer:tick', expect.objectContaining({ mode: 'shortBreak' }));
  });

  // ── start / pause ─────────────────────────────────────────────────────────

  test('start() sets running to true and emits timer:tick', () => {
    model.start();
    expect(model.running).toBe(true);
    expect(eventBusMock.emit).toHaveBeenCalledWith('timer:tick', expect.objectContaining({ running: true }));
  });

  test('start() does not restart if already running', () => {
    model.start();
    const intervalId = model._interval;
    model.start();                             // second call should be a no-op
    expect(model._interval).toBe(intervalId); // same interval
  });

  test('pause() sets running to false', () => {
    model.start();
    model.pause();
    expect(model.running).toBe(false);
    expect(model._interval).toBeNull();
  });

  test('pause() is a no-op when already paused', () => {
    expect(() => model.pause()).not.toThrow();
    expect(model.running).toBe(false);
  });

  // ── toggle ────────────────────────────────────────────────────────────────

  test('toggle() starts timer when paused', () => {
    model.toggle();
    expect(model.running).toBe(true);
  });

  test('toggle() pauses timer when running', () => {
    model.start();
    model.toggle();
    expect(model.running).toBe(false);
  });

  // ── reset ─────────────────────────────────────────────────────────────────

  test('reset() restores remaining to full mode duration', () => {
    model.start();
    jest.advanceTimersByTime(5000); // advance 5 seconds
    model.reset();
    expect(model.remaining).toBe(25 * 60);
    expect(model.running).toBe(false);
  });

  // ── tick countdown ────────────────────────────────────────────────────────

  test('timer decrements remaining every second', () => {
    model.start();
    jest.advanceTimersByTime(3000);
    expect(model.remaining).toBe(25 * 60 - 3);
  });

  test('timer emits timer:tick on each second', () => {
    model.start();
    eventBusMock.emit.mockClear();
    jest.advanceTimersByTime(3000);
    const tickCalls = eventBusMock.emit.mock.calls.filter(([e]) => e === 'timer:tick');
    expect(tickCalls.length).toBeGreaterThanOrEqual(3);
  });

  // ── _complete / auto-switch ───────────────────────────────────────────────

  test('completing a focus session increments session count', () => {
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(model.session).toBe(1);
  });

  test('completing a focus session emits timer:complete', () => {
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(eventBusMock.emit).toHaveBeenCalledWith(
      'timer:complete',
      expect.objectContaining({ mode: 'focus' })
    );
  });

  test('after focus completes, switches to shortBreak (session not multiple of 4)', () => {
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(model.mode).toBe('shortBreak');
  });

  test('after focus completes on 4th session, switches to longBreak', () => {
    model.session = 3;               // next completion will be session 4
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(model.mode).toBe('longBreak');
  });

  test('after shortBreak completes, switches back to focus', () => {
    model.setMode('shortBreak');
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(model.mode).toBe('focus');
  });

  test('completing a break does NOT increment session count', () => {
    model.setMode('shortBreak');
    model.remaining = 1;
    model.start();
    jest.advanceTimersByTime(1000);
    expect(model.session).toBe(0);
  });

  // ── setFocusTime ──────────────────────────────────────────────────────────

  test('setFocusTime() updates focus duration', () => {
    model.setFocusTime(45);
    expect(model.MODES.focus.duration).toBe(45 * 60);
  });

  test('setFocusTime() updates remaining if in focus mode and not running', () => {
    model.setFocusTime(30);
    expect(model.remaining).toBe(30 * 60);
  });

  test('setFocusTime() does NOT update remaining if timer is running', () => {
    model.start();
    model.setFocusTime(30);
    // remaining should still be decrementing from 25*60, not jumped to 30*60
    expect(model.remaining).toBeLessThanOrEqual(25 * 60);
    expect(model.remaining).not.toBe(30 * 60);
  });

  test('setFocusTime() ignores invalid values (0, NaN)', () => {
    model.setFocusTime(0);
    expect(model.MODES.focus.duration).toBe(25 * 60); // unchanged
    model.setFocusTime('abc');
    expect(model.MODES.focus.duration).toBe(25 * 60); // unchanged
  });

  test('setFocusTime() persists to Storage', () => {
    model.setFocusTime(20);
    expect(storageMock.set).toHaveBeenCalledWith('pomodoroFocusTime', 20);
  });

  // ── resetFocusSessions ────────────────────────────────────────────────────

  test('resetFocusSessions() resets session to 0', () => {
    model.session = 5;
    model.resetFocusSessions();
    expect(model.session).toBe(0);
  });

  test('resetFocusSessions() persists to Storage', () => {
    model.resetFocusSessions();
    expect(storageMock.set).toHaveBeenCalledWith('pomodoroStats', { session: 0 });
  });

  // ── _state ────────────────────────────────────────────────────────────────

  test('_state() returns complete state snapshot', () => {
    const state = model._state();
    expect(state).toMatchObject({
      mode:      'focus',
      label:     'Foco',
      total:     25 * 60,
      remaining: 25 * 60,
      running:   false,
      session:   0,
      focusDurationMinutes: 25,
    });
  });
});
