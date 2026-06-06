'use strict';

/**
 * Utilitário de Migração de Dados do LocalStorage para o Supabase
 */

async function migrateLegacyData(userId) {
  if (!userId) {
    alert('Erro: Usuário não autenticado.');
    return;
  }

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

      // Formatar dados para o banco
      const recordsToInsert = data.map(item => {
        // Garantir que todos os itens tenham o user_id
        const newItem = { ...item, user_id: userId };
        return newItem;
      });

      console.log(`Migrando ${recordsToInsert.length} itens de ${mig.key} para ${mig.table}...`);

      const { error } = await window.SupabaseClient
        .from(mig.table)
        .upsert(recordsToInsert, { onConflict: 'id' }); // Upsert para não duplicar se já existir

      if (error) {
        console.error(`Erro ao migrar ${mig.table}:`, error);
        errorCount++;
      } else {
        migratedCount++;
        // Opcional: limpar o localStorage depois do sucesso para não migrar de novo
        // localStorage.removeItem(mig.key);
      }
    } catch (err) {
      console.error(`Erro inesperado ao migrar ${mig.key}:`, err);
      errorCount++;
    }
  }

  // Migrar metadados de Materiais (sem os blobs, pois precisariam de upload complexo)
  // Como são PDFs/Imagens locais, deixaremos para o usuário reupar, ou podemos tentar migrar:
  try {
    const materialsStr = localStorage.getItem('materials');
    if (materialsStr) {
      const materials = JSON.parse(materialsStr);
      if (Array.isArray(materials) && materials.length > 0) {
        const records = materials.map(m => ({ ...m, user_id: userId }));
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
    alert(`Migração concluída com alguns erros. Abra o console (F12) para detalhes.`);
  } else {
    alert(`Migração concluída com SUCESSO! Todos os seus dados antigos foram salvos na nuvem. A página será atualizada.`);
    window.location.reload();
  }
}

window.migrateLegacyData = migrateLegacyData;
