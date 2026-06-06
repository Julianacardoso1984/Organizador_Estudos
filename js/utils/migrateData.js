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
        for (const [key, value] of Object.entries(item)) {
          if (value === undefined) continue;
          let mappedValue = value;
          
          // Mapear IDs
          if (key === 'id' || key === 'subjectId' || key === 'taskId' || key === 'courseId') {
            mappedValue = getNewId(value);
          }
          
          // Converter arrays para JSON em blocos ou questions (evitar erros no Supabase jsonb)
          if ((key === 'blocks' || key === 'questions' || key === 'nodes' || key === 'edges') && Array.isArray(value)) {
            // Se tiverem IDs internos antigos, idealmente deveriam ser mapeados, 
            // mas como o Supabase JSONB aceita qualquer formato (mesmo "c1"), podemos só passar direto
          }

          // Se a data for vazia ou inválida, não enviar (deixar o Supabase usar o DEFAULT now())
          if ((key === 'createdAt' || key === 'updatedAt') && !value) {
            continue;
          }

          newItem[toSnakeCase(key)] = mappedValue;
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
        const records = materials.map(m => ({ 
          ...m, 
          id: getNewId(m.id), 
          subject_id: getNewId(m.subjectId), 
          user_id: userId 
        }));
        // Remover subjectId que era camelCase original
        records.forEach(r => delete r.subjectId);
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
