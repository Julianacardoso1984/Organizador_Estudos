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

  // ── Sincronização & Backup de Dados (JSON completo + Arquivos) ────────────

  async function exportFullBackup() {
    const keys = [
      'subjects',
      'pages',
      'tasks',
      'mindMaps',
      'materials',
      'flashcards',
      'quizzes',
      'courses',
      'pomodoroStats',
      'calendarEvents',
      'theme',
      'studySchedule',
      'geminiAPIKey'
    ];
    const backup = {
      localStorage: {},
      files: {}
    };

    // 1. Exportar localStorage
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val !== null) {
        try {
          backup.localStorage[k] = JSON.parse(val);
        } catch (e) {
          backup.localStorage[k] = val;
        }
      }
    });

    // 2. Exportar arquivos do IndexedDB
    const materialsJson = localStorage.getItem('materials');
    if (materialsJson) {
      try {
        const materials = JSON.parse(materialsJson);
        if (Array.isArray(materials)) {
          for (const m of materials) {
            const blob = await getFile(m.id);
            if (blob) {
              // Converter blob para DataURL (Base64)
              const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
              backup.files[m.id] = dataUrl;
            }
          }
        }
      } catch (e) {
        console.error('Erro ao ler arquivos para backup:', e);
      }
    }

    return backup;
  }

  async function importFullBackup(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Formato de backup inválido.');
    }

    // Suporta o formato unificado novo ou o formato simples antigo
    const lsData = backupData.localStorage || backupData;

    // 1. Importar localStorage
    const allowedKeys = [
      'subjects',
      'pages',
      'tasks',
      'mindMaps',
      'materials',
      'flashcards',
      'quizzes',
      'courses',
      'pomodoroStats',
      'calendarEvents',
      'theme',
      'studySchedule',
      'geminiAPIKey'
    ];

    allowedKeys.forEach(k => {
      if (lsData[k] !== undefined) {
        const val = lsData[k];
        if (typeof val === 'object') {
          localStorage.setItem(k, JSON.stringify(val));
        } else {
          localStorage.setItem(k, val);
        }
      }
    });

    // 2. Importar arquivos do IndexedDB se existirem
    if (backupData.files && typeof backupData.files === 'object') {
      for (const [id, dataUrl] of Object.entries(backupData.files)) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          await saveFile(id, blob);
        } catch (e) {
          console.error(`Erro ao restaurar arquivo ${id} no IndexedDB:`, e);
        }
      }
    }
  }

  return { get, set, remove, saveFile, getFile, deleteFile, clearAllFiles, initDB, exportFullBackup, importFullBackup };
})();
