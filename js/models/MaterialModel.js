'use strict';

/**
 * MaterialModel — Metadados dos arquivos enviados por matéria.
 * O blob real é salvo no IndexedDB via Storage.saveFile().
 */
class MaterialModel {
  constructor() {
    this.materials = [];
  }

  async loadData(userId) {
    if (!window.SupabaseClient) return;
    const { data, error } = await window.SupabaseClient
      .from('materials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao carregar materials:', error);
    } else {
      this.materials = data || [];
      this.materials.forEach(m => {
        m.subjectId = m.subject_id;
        m.driveUrl = m.drive_url;
        m.filePath = m.file_path;
        m.uploadedAt = m.created_at;
      });
    }
  }

  getAll() { return [...this.materials]; }

  getBySubject(subjectId) {
    return this.materials.filter(m => m.subjectId === subjectId);
  }

  getById(id) { return this.materials.find(m => m.id === id) || null; }

  async create(subjectId, file, tags = []) {
    const id = _uuid();
    const type = this._detectType(file.type, file.name);
    const userId = window.currentUser.id;

    const fileExt = file.name.split('.').pop();
    const fileName = `${id}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const meta = {
      id,
      user_id: userId,
      subject_id: subjectId,
      title:       file.name,
      type,                      // 'pdf' | 'image' | 'audio' | 'video' | 'doc' | 'other'
      file_path:   filePath,
      created_at: new Date().toISOString()
    };

    if (window.SupabaseClient) {
      // 1. Upload the file to Supabase Storage
      const { error: uploadError } = await window.SupabaseClient.storage
        .from('materials')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error('Erro ao fazer upload no Supabase Storage:', uploadError);
        throw uploadError;
      }

      // 2. Save metadata in the database
      const { error: dbError } = await window.SupabaseClient.from('materials').insert(meta);
      if (dbError) console.error('Erro ao salvar material_meta no Supabase:', dbError);
    }

    const localMeta = { ...meta, subjectId, name: meta.title, filePath, uploadedAt: meta.created_at, size: file.size };
    this.materials.push(localMeta);
    EventBus.emit('materials:updated', this.getAll());
    return localMeta;
  }

  async createDriveLink(subjectId, driveFile, tags = []) {
    const id = _uuid();
    const meta = {
      id,
      user_id: window.currentUser.id,
      subject_id: subjectId,
      title:       driveFile.name,
      type:       'drive',
      drive_url:   driveFile.webViewLink,
      created_at: new Date().toISOString()
    };

    const localMeta = { ...meta, subjectId, name: meta.title, type: 'drive', driveUrl: meta.drive_url, uploadedAt: meta.created_at, size: parseInt(driveFile.size) || 0 };
    this.materials.push(localMeta);
    EventBus.emit('materials:updated', this.getAll());

    if (window.SupabaseClient) {
      const { error } = await window.SupabaseClient.from('materials').insert(meta);
      if (error) console.error('Erro ao salvar material_drive no Supabase:', error);
    }
    return localMeta;
  }

  async update(id, data) {
    const idx = this.materials.findIndex(m => m.id === id);
    if (idx === -1) return null;
    
    this.materials[idx] = { ...this.materials[idx], ...data };
    EventBus.emit('materials:updated', this.getAll());

    if (window.SupabaseClient) {
      const dbData = { ...data };
      if (dbData.subjectId !== undefined) { dbData.subject_id = dbData.subjectId; delete dbData.subjectId; }
      if (dbData.name !== undefined) { dbData.title = dbData.name; delete dbData.name; }
      
      const { error } = await window.SupabaseClient.from('materials').update(dbData).eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao atualizar material no Supabase:', error);
    }
    return this.materials[idx];
  }

  async delete(id) {
    const m = this.getById(id);
    if (!m) return;
    
    this.materials = this.materials.filter(x => x.id !== id);
    EventBus.emit('materials:updated', this.getAll());

    if (window.SupabaseClient) {
      if (m.type !== 'drive' && m.filePath) {
        // Remove from storage
        await window.SupabaseClient.storage.from('materials').remove([m.filePath]);
      }
      // Remove from database
      const { error } = await window.SupabaseClient.from('materials').delete().eq('id', id).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar material no Supabase:', error);
    }
  }

  async deleteBySubject(subjectId) {
    const toDelete = this.materials.filter(m => m.subjectId === subjectId);
    this.materials = this.materials.filter(m => m.subjectId !== subjectId);
    EventBus.emit('materials:updated', this.getAll());

    if (window.SupabaseClient) {
      for (const m of toDelete) {
        if (m.type !== 'drive' && m.filePath) {
          await window.SupabaseClient.storage.from('materials').remove([m.filePath]);
        }
      }
      const { error } = await window.SupabaseClient.from('materials').delete().eq('subject_id', subjectId).eq('user_id', window.currentUser.id);
      if (error) console.error('Erro ao deletar materials por subject no Supabase:', error);
    }
  }

  async getBlob(id) {
    const m = this.getById(id);
    if (!m || m.type === 'drive' || !m.filePath) return null;
    
    if (window.SupabaseClient) {
      const { data, error } = await window.SupabaseClient.storage.from('materials').download(m.filePath);
      if (error) {
        console.error('Erro ao baixar arquivo do Supabase:', error);
        return null;
      }
      return data;
    }
    return null;
  }

  async getBlobURL(id) {
    const blob = await this.getBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  _detectType(mimeType, name) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.includes('word') || name.endsWith('.doc') || name.endsWith('.docx')) return 'doc';
    if (name.endsWith('.pptx') || name.endsWith('.ppt')) return 'slide';
    return 'other';
  }
}
