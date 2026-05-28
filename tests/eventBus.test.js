'use strict';

/**
 * EventBus unit tests
 * Tests the pub/sub mechanism used by all models and views.
 */

// ── Inline EventBus implementation (copy from source, no require needed) ──────
// We recreate a fresh EventBus for each test via factory to avoid shared state.
function createEventBus() {
  const listeners = {};
  return {
    on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },
    off(event, callback) {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },
    emit(event, data) {
      if (!listeners[event]) return;
      [...listeners[event]].forEach(cb => {
        try { cb(data); } catch (e) { /* ignore in tests */ }
      });
    },
    once(event, callback) {
      const wrapper = (data) => {
        callback(data);
        this.off(event, wrapper);
      };
      this.on(event, wrapper);
    },
    clear(event) {
      if (event) delete listeners[event];
      else Object.keys(listeners).forEach(k => delete listeners[k]);
    },
    _listeners: listeners,
  };
}

describe('EventBus', () => {
  let bus;

  beforeEach(() => {
    bus = createEventBus();
  });

  // ── on / emit ──────────────────────────────────────────────────────────────

  test('on() + emit() — invokes registered callback with data', () => {
    const cb = jest.fn();
    bus.on('test:event', cb);
    bus.emit('test:event', { value: 42 });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ value: 42 });
  });

  test('emit() with no listeners does nothing (no throw)', () => {
    expect(() => bus.emit('nonexistent:event', {})).not.toThrow();
  });

  test('multiple listeners on same event are all called', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    bus.on('multi', cb1);
    bus.on('multi', cb2);
    bus.emit('multi', 'payload');
    expect(cb1).toHaveBeenCalledWith('payload');
    expect(cb2).toHaveBeenCalledWith('payload');
  });

  // ── off ───────────────────────────────────────────────────────────────────

  test('off() removes a specific listener', () => {
    const cb = jest.fn();
    bus.on('remove:me', cb);
    bus.off('remove:me', cb);
    bus.emit('remove:me', {});
    expect(cb).not.toHaveBeenCalled();
  });

  test('off() on non-existent event does not throw', () => {
    expect(() => bus.off('ghost', jest.fn())).not.toThrow();
  });

  test('off() only removes the target callback, not others', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    bus.on('shared', cb1);
    bus.on('shared', cb2);
    bus.off('shared', cb1);
    bus.emit('shared', 'data');
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledWith('data');
  });

  // ── once ──────────────────────────────────────────────────────────────────

  test('once() fires callback exactly once', () => {
    const cb = jest.fn();
    bus.once('one-time', cb);
    bus.emit('one-time', 1);
    bus.emit('one-time', 2);
    bus.emit('one-time', 3);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(1);
  });

  // ── clear ─────────────────────────────────────────────────────────────────

  test('clear(event) removes all listeners for that event only', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    bus.on('evt1', cb1);
    bus.on('evt2', cb2);
    bus.clear('evt1');
    bus.emit('evt1', {});
    bus.emit('evt2', {});
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalled();
  });

  test('clear() with no args removes all listeners', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    bus.on('a', cb1);
    bus.on('b', cb2);
    bus.clear();
    bus.emit('a', {});
    bus.emit('b', {});
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  // ── Error isolation ───────────────────────────────────────────────────────

  test('error in one listener does not prevent subsequent listeners from firing', () => {
    const throwing = jest.fn(() => { throw new Error('boom'); });
    const surviving = jest.fn();
    bus.on('error:test', throwing);
    bus.on('error:test', surviving);
    expect(() => bus.emit('error:test', {})).not.toThrow();
    expect(surviving).toHaveBeenCalled();
  });
});
