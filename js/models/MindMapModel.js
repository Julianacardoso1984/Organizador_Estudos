'use strict';

/**
 * MindMapModel — Gerencia mapas mentais e conceituais (nós + arestas).
 */
class MindMapModel {
  constructor() {
    this.maps = Storage.get('mindMaps') || [];
  }

  getAll() { return [...this.maps]; }

  getBySubject(subjectId) {
    return this.maps.filter(m => m.subjectId === subjectId);
  }

  getById(id) { return this.maps.find(m => m.id === id) || null; }

  create(subjectId, name, type = 'mind') {
    const map = {
      id: _uuid(),
      subjectId,
      name: name.trim(),
      type,          // 'mind' | 'concept'
      nodes: [],
      edges: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.maps.push(map);
    this._save();
    EventBus.emit('mindmaps:updated', this.getAll());
    return map;
  }

  update(id, data) {
    const idx = this.maps.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.maps[idx] = { ...this.maps[idx], ...data, updatedAt: new Date().toISOString() };
    this._save();
    EventBus.emit('mindmaps:updated', this.getAll());
    return this.maps[idx];
  }

  // Salva nós + arestas do mapa (chamado pelo MindMapView após cada alteração)
  saveGraph(id, nodes, edges) {
    return this.update(id, { nodes, edges });
  }

  delete(id) {
    this.maps = this.maps.filter(m => m.id !== id);
    this._save();
    EventBus.emit('mindmaps:updated', this.getAll());
  }

  deleteBySubject(subjectId) {
    this.maps = this.maps.filter(m => m.subjectId !== subjectId);
    this._save();
    EventBus.emit('mindmaps:updated', this.getAll());
  }

  // Helpers de nós
  createNode(mapId, x, y, text = 'Novo nó', color = '#8B5CF6') {
    const map = this.getById(mapId);
    if (!map) return null;
    const node = { id: _uuid(), x, y, text, color, width: 130, height: 44 };
    const nodes = [...map.nodes, node];
    this.saveGraph(mapId, nodes, map.edges);
    return node;
  }

  updateNode(mapId, nodeId, data) {
    const map = this.getById(mapId);
    if (!map) return null;
    const nodes = map.nodes.map(n => n.id === nodeId ? { ...n, ...data } : n);
    this.saveGraph(mapId, nodes, map.edges);
  }

  deleteNode(mapId, nodeId) {
    const map = this.getById(mapId);
    if (!map) return;
    const nodes = map.nodes.filter(n => n.id !== nodeId);
    const edges = map.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    this.saveGraph(mapId, nodes, edges);
  }

  // Helpers de arestas
  createEdge(mapId, fromId, toId, label = '') {
    const map = this.getById(mapId);
    if (!map) return null;
    // Evita duplicata
    const exists = map.edges.find(e => e.from === fromId && e.to === toId);
    if (exists) return exists;
    const edge = { id: _uuid(), from: fromId, to: toId, label };
    const edges = [...map.edges, edge];
    this.saveGraph(mapId, map.nodes, edges);
    return edge;
  }

  deleteEdge(mapId, edgeId) {
    const map = this.getById(mapId);
    if (!map) return;
    const edges = map.edges.filter(e => e.id !== edgeId);
    this.saveGraph(mapId, map.nodes, edges);
  }

  updateEdgeLabel(mapId, edgeId, label) {
    const map = this.getById(mapId);
    if (!map) return;
    const edges = map.edges.map(e => e.id === edgeId ? { ...e, label } : e);
    this.saveGraph(mapId, map.nodes, edges);
  }

  _save() { Storage.set('mindMaps', this.maps); }
}
