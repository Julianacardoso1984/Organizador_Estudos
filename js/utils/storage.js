'use strict';

/**
 * Storage — Wrapper de localStorage + IndexedDB para persistência de dados.
 * Dados estruturais (JSON pequenos) → localStorage.
 * Arquivos grandes (blobs de materiais) → IndexedDB.
 */
const Storage = (() => {
  const DB_NAME = 'EstudosDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'materials';
  let db = null;

  // ── LocalStorage ──────────────────────────────────────────────────────────

  function get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage.set error (quota?):', e);
    }
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  // ── IndexedDB (para arquivos/blobs) ───────────────────────────────────────

  function initDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);

      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };

      req.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveFile(id, blob) {
    await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id, blob, savedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function getFile(id) {
    await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = (e) => resolve(e.target.result?.blob || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteFile(id) {
    await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async function clearAllFiles() {
    await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = resolve;
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  return { get, set, remove, saveFile, getFile, deleteFile, clearAllFiles, initDB };
})();
