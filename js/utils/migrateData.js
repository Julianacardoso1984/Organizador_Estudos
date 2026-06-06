'use strict';

/**
 * Utilitário de Migração de Dados do LocalStorage para o Supabase
 */

async function migrateLegacyData(userId) {
  if (!userId) {
    alert('Erro: Usuário não autenticado.');
    return;
  }

  // Gerador de UUID seguro
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

  // Mapa de IDs antigos para novos UUIDs (para manter as conexões)
  const idMap = new Map();
  const getNewId = (oldId) => {
    if (!oldId) return null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(oldId)) return oldId; // Já é UUID
    if (!idMap.has(oldId)) idMap.set(oldId, uuid());
    return idMap.get(oldId);
  };

  const MIGRATIONS = [
    { key: 'subjects', table: 'subjects' },
    { key: 'pages', table: 'pages' },
    { key: 'tasks', table: 'tasks' },
    { key: 'calendarEvents', table: 'calendar_events' },
    { key: 'topics', table: 'topics' },
    { key: 'mindMaps', table: 'mind_maps' },
    { key: 'courses', table: 'courses' },
    { key: 'flashcards', table: 'flashcards' },
    { key: 'quizzes', table: 'quizzes' },
    { key: 'usefulLinks', table: 'useful_links' }
  ];

  const TABLE_COLUMNS = {
    'subjects': ['id', 'user_id', 'name', 'emoji', 'color', 'created_at'],
    'pages': ['id', 'user_id', 'subject_id', 'title', 'blocks', 'created_at', 'updated_at'],
    'tasks': ['id', 'user_id', 'subject_id', 'title', 'description', 'status', 'priority', 'due_date', 'created_at'],
    'calendar_events': ['id', 'user_id', 'task_id', 'subject_id', 'title', 'date', 'type', 'color', 'duration', 'notes', 'created_at'],
    'topics': ['id', 'user_id', 'subject_id', 'name', 'studied', 'created_at'],
    'mind_maps': ['id', 'user_id', 'subject_id', 'name', 'type', 'nodes', 'edges', 'created_at', 'updated_at'],
    'courses': ['id', 'user_id', 'name', 'url', 'emoji', 'created_at'],
    'flashcards': ['id', 'user_id', 'subject_id', 'question', 'answer', 'last_reviewed', 'next_review', 'created_at'],
    'quizzes': ['id', 'user_id', 'subject_id', 'title', 'questions', 'score', 'completed_at', 'created_at'],
    'useful_links': ['id', 'user_id', 'title', 'url', 'emoji', 'description', 'created_at'],
    'materials': ['id', 'user_id', 'subject_id', 'title', 'type', 'drive_url', 'file_path', 'created_at']
  };

  let migratedCount = 0;
  let errorCount = 0;

  for (const mig of MIGRATIONS) {
    try {
      const dataStr = localStorage.getItem(mig.key);
      if (!dataStr) continue;

      const data = JSON.parse(dataStr);
      if (!Array.isArray(data) || data.length === 0) continue;

      const toSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

      const recordsToInsert = data.map(item => {
        const newItem = { user_id: userId };
        const allowedCols = TABLE_COLUMNS[mig.table];

        for (let [key, value] of Object.entries(item)) {
          if (value === undefined) continue;
          
          // Tratamentos especiais para flashcards antigos
          if (mig.table === 'flashcards') {
            if (key === 'front') key = 'question';
            if (key === 'back') key = 'answer';
            if (key === 'nextReviewDate') key = 'next_review';
            if (key === 'lastReviewedDate') key = 'last_reviewed';
          }

          let mappedValue = value;
          
          if (key === 'id') {
            mappedValue = getNewId(value);
          } else if (key === 'subjectId' || key === 'taskId' || key === 'courseId') {
            // Se for chave estrangeira e não existir no mapa (órfão), definir como null para não quebrar o banco
            if (!value) {
              mappedValue = null;
            } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
              mappedValue = value;
            } else if (idMap.has(value)) {
              mappedValue = idMap.get(value);
            } else {
              mappedValue = null; // Dado órfão, removemos a referência
            }
          }

          if ((key === 'createdAt' || key === 'updatedAt') && !value) {
            continue;
          }

          const finalColName = toSnakeCase(key);

          // SÓ adicionar se a coluna existir de verdade na tabela do Supabase
          if (allowedCols && allowedCols.includes(finalColName)) {
            newItem[finalColName] = mappedValue;
          }
        }
        return newItem;
      });

      console.log(`Migrando ${recordsToInsert.length} itens de ${mig.key} para ${mig.table}...`);

      const { error } = await window.SupabaseClient
        .from(mig.table)
        .upsert(recordsToInsert, { onConflict: 'id' }); 

      if (error) {
        console.error(`Erro ao migrar ${mig.table}:`, error);
        if (!window._firstMigrateError) window._firstMigrateError = error;
        errorCount++;
      } else {
        migratedCount++;
      }
    } catch (err) {
      console.error(`Erro inesperado ao migrar ${mig.key}:`, err);
      if (!window._firstMigrateError) window._firstMigrateError = err;
      errorCount++;
    }
  }

  try {
    const materialsStr = localStorage.getItem('materials');
    if (materialsStr) {
      const materials = JSON.parse(materialsStr);
      if (Array.isArray(materials) && materials.length > 0) {
        const records = materials.map(m => {
          let sId = null;
          if (m.subjectId) {
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(m.subjectId)) {
              sId = m.subjectId;
            } else if (idMap.has(m.subjectId)) {
              sId = idMap.get(m.subjectId);
            }
          }
          const rec = { 
            ...m, 
            id: getNewId(m.id), 
            subject_id: sId, 
            user_id: userId 
          };
          delete rec.subjectId;
          return rec;
        });
        await window.SupabaseClient.from('materials').upsert(records, { onConflict: 'id' });
        migratedCount++;
      }
    }
  } catch (err) {
    console.error(err);
  }

  if (migratedCount === 0 && errorCount === 0) {
    alert('Nenhum dado local antigo encontrado para migrar.');
  } else if (errorCount > 0) {
    const errStr = window._firstMigrateError ? JSON.stringify(window._firstMigrateError) : 'Erro desconhecido';
    alert(`Migração falhou em alguns itens. Detalhe do primeiro erro: ${errStr}\n\nCopie essa mensagem e envie para eu corrigir!`);
  } else {
    alert(`Migração concluída com SUCESSO! Todos os seus dados antigos foram salvos na nuvem. A página será atualizada.`);
    window.location.reload();
  }
}

window.migrateLegacyData = migrateLegacyData;
