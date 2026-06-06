'use strict';

/**
 * MindMapModel — Gerencia mapas mentais e conceituais (nós + arestas).
 */
class MindMapModel {
  constructor() {
    this.maps = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('mind_maps')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar mind_maps:', error);
    } else {
      this.maps = data || [];
      this.maps.forEach(m => {
        m.subjectId = m.subject_id;
        m.createdAt = m.created_at;
        m.updatedAt = m.updated_at;
      });
    }
  }

  getAll() { return [...this.maps]; }

  getBySubject(subjectId) {
    return this.maps.filter(m => m.subjectId === subjectId);
  }

  getById(id) { return this.maps.find(m => m.id === id) || null; }

  async create(subjectId, name, type = 'mind') {
    const map = {
      id: _uuid(),
      user_id: window.currentUser.id,
      subject_id: subjectId,
      name: name.trim(),
      type,          // 'mind' | 'concept'
      nodes: [],
      edges: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const localMap = { ...map, subjectId: map.subject_id, createdAt: map.created_at, updatedAt: map.updated_at };
    this.maps.push(localMap);
    EventBus.emit('mindmaps:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('mind_maps').insert(map);
      if (error) console.error('Erro ao salvar mind_map no Supabase:', error);
    }
    return localMap;
  }

  async update(id, data) {
    const idx = this.maps.findIndex(m => m.id === id);
    if (idx === -1) return null;
    
    const now = new Date().toISOString();
    this.maps[idx] = { ...this.maps[idx], ...data, updatedAt: now };
    EventBus.emit('mindmaps:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { ...data, updated_at: now };
      if (dbData.subjectId !== undefined) { dbData.subject_id = dbData.subjectId; delete dbData.subjectId; }
      
      const { error } = await window.SupabaseClient.from('mind_maps').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar mind_map no Supabase:', error);
    }
    return this.maps[idx];
  }

  // Salva nós + arestas do mapa (chamado pelo MindMapView após cada alteração)
  saveGraph(id, nodes, edges) {
    return this.update(id, { nodes, edges });
  }

  async delete(id) {
    this.maps = this.maps.filter(m => m.id !== id);
    EventBus.emit('mindmaps:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('mind_maps').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar mind_map no Supabase:', error);
    }
  }

  async deleteBySubject(subjectId) {
    this.maps = this.maps.filter(m => m.subjectId !== subjectId);
    EventBus.emit('mindmaps:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('mind_maps').delete().eq('subject_id', subjectId).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar mind_maps por subject no Supabase:', error);
    }
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
}
