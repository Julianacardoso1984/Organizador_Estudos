'use strict';

// ── localStorage mock ─────────────────────────────────────────────────────────
function createLocalStorageMock() {
  let store = {};
  return {
    getItem:    (k)    => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => { store = {}; },
    _store:     ()     => store,
  };
}

// ── EventBus mock ─────────────────────────────────────────────────────────────
function createEventBusMock() {
  const listeners = {};
  return {
    on:    jest.fn((event, cb)   => { (listeners[event] = listeners[event] || []).push(cb); }),
    off:   jest.fn((event, cb)   => { if (listeners[event]) listeners[event] = listeners[event].filter(fn => fn !== cb); }),
    emit:  jest.fn((event, data) => { (listeners[event] || []).forEach(cb => cb(data)); }),
    once:  jest.fn(),
    clear: jest.fn((event)       => { if (event) delete listeners[event]; else Object.keys(listeners).forEach(k => delete listeners[k]); }),
    _listeners: listeners,
  };
}

// ── Storage mock ──────────────────────────────────────────────────────────────
function createStorageMock(lsMock) {
  return {
    get:    jest.fn((key)        => { const v = lsMock.getItem(key); return v ? JSON.parse(v) : null; }),
    set:    jest.fn((key, value) => { lsMock.setItem(key, JSON.stringify(value)); }),
    remove: jest.fn((key)        => { lsMock.removeItem(key); }),
    // Async stubs (IndexedDB not needed for model unit tests)
    saveFile:      jest.fn().mockResolvedValue(undefined),
    getFile:       jest.fn().mockResolvedValue(null),
    deleteFile:    jest.fn().mockResolvedValue(undefined),
    clearAllFiles: jest.fn().mockResolvedValue(undefined),
    initDB:        jest.fn().mockResolvedValue({}),
    exportFullBackup: jest.fn().mockResolvedValue({ localStorage: {}, files: {} }),
    importFullBackup: jest.fn().mockResolvedValue(undefined),
  };
}

// ── _uuid mock — deterministic IDs for predictable assertions ─────────────────
let uuidCounter = 0;
function resetUuidCounter() { uuidCounter = 0; }
function mockUuid() { return `mock-uuid-${++uuidCounter}`; }

module.exports = { createLocalStorageMock, createEventBusMock, createStorageMock, mockUuid, resetUuidCounter };
