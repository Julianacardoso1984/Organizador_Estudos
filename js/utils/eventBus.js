'use strict';

/**
 * EventBus — Sistema de pub/sub para comunicação desacoplada entre Model, View e Controller.
 */
const EventBus = (() => {
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
        try { cb(data); } catch (e) { console.error(`EventBus error on "${event}":`, e); }
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
    }
  };
})();
