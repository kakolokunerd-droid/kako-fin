// Serviço para limpeza automática de notificações aos domingos

import { db } from './db';

const LAST_CLEANUP_KEY = 'last_notification_cleanup_date';

/**
 * Busca todos os IDs de usuários do localStorage
 */
function getAllUserIds(): string[] {
  const userIds: string[] = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('fintrack_')) {
      // Extrair userId de diferentes formatos de chave
      let userId = '';
      
      // Formato: fintrack_{userId}_transactions
      if (key.includes('_transactions')) {
        userId = key.replace('fintrack_', '').replace('_transactions', '');
      }
      // Formato: fintrack_{userId}_goals
      else if (key.includes('_goals')) {
        userId = key.replace('fintrack_', '').replace('_goals', '');
      }
      // Formato: fintrack_{userId}_shopping
      else if (key.includes('_shopping')) {
        userId = key.replace('fintrack_', '').replace('_shopping', '');
      }
      // Formato: fintrack_profile_{userId}
      else if (key.includes('_profile_')) {
        userId = key.replace('fintrack_profile_', '');
      }
      
      if (userId && !seen.has(userId) && userId !== 'global') {
        seen.add(userId);
        userIds.push(userId);
      }
    }
  }
  
  return userIds;
}

/**
 * Verifica se é domingo e se já executou a limpeza hoje
 */
function shouldRunCleanup(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  
  // Só executar aos domingos
  if (dayOfWeek !== 0) {
    return false;
  }

  // Verificar se já executou hoje
  const lastCleanupDate = localStorage.getItem(LAST_CLEANUP_KEY);
  if (lastCleanupDate) {
    const lastCleanup = new Date(lastCleanupDate);
    const today = new Date();
    
    // Comparar apenas data (sem hora)
    const lastCleanupDateOnly = new Date(lastCleanup.getFullYear(), lastCleanup.getMonth(), lastCleanup.getDate());
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Se já executou hoje, não executar novamente
    if (lastCleanupDateOnly.getTime() === todayDateOnly.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Marca todas as notificações como deletadas (exclusão lógica)
 * para todos os usuários
 */
async function markAllNotificationsAsDeleted(): Promise<void> {
  try {
    console.log('🧹 Iniciando limpeza automática de notificações (domingo)...');
    
    // Obter todos os usuários
    const allUserIds = getAllUserIds();
    
    // Se não houver usuários, não há nada para limpar
    if (allUserIds.length === 0) {
      console.log('📭 Nenhum usuário encontrado. Limpeza cancelada.');
      // Salvar data da limpeza mesmo sem usuários para evitar tentativas repetidas
      localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString());
      return;
    }

    // Buscar todas as notificações para cada usuário
    let totalDeleted = 0;
    
    for (const userId of allUserIds) {
      try {
        const notifications = await db.getNotifications(userId);
        
        // Marcar cada notificação como deletada (exclusão lógica)
        // A função deleteNotification já marca como deletada usando deleted_at
        for (const notification of notifications) {
          try {
            await db.deleteNotification(userId, notification.id);
            totalDeleted++;
          } catch (error) {
            console.error(`Erro ao deletar notificação ${notification.id} para usuário ${userId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Erro ao processar notificações do usuário ${userId}:`, error);
      }
    }

    // Salvar data da última limpeza
    localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString());
    
    console.log(`✅ Limpeza automática concluída. ${totalDeleted} notificações marcadas como deletadas para ${allUserIds.length} usuário(s).`);
    
    // Disparar evento para atualizar contadores de notificações
    window.dispatchEvent(new CustomEvent('notification-updated'));
  } catch (error) {
    console.error('❌ Erro ao executar limpeza automática de notificações:', error);
  }
}

/**
 * Executa a limpeza automática se necessário (verifica se é domingo e se já executou hoje)
 */
export async function runAutoCleanupIfNeeded(): Promise<void> {
  if (shouldRunCleanup()) {
    await markAllNotificationsAsDeleted();
  }
}

/**
 * Verifica periodicamente se precisa executar a limpeza
 * Deve ser chamado quando o app inicia ou periodicamente
 */
export function startAutoCleanupScheduler(): () => void {
  // Executar imediatamente se necessário
  runAutoCleanupIfNeeded();

  // Verificar a cada hora se é domingo e precisa executar
  const interval = setInterval(() => {
    runAutoCleanupIfNeeded();
  }, 3600000); // 1 hora

  // Retornar função para parar o scheduler
  return () => clearInterval(interval);
}

