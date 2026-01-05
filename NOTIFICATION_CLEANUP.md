# Limpeza Automática de Notificações

## 📋 Visão Geral

O sistema possui uma funcionalidade de limpeza automática de notificações que executa **todos os domingos**, marcando todas as notificações como deletadas (exclusão lógica) para todos os usuários.

## 🔄 Como Funciona

### Exclusão Lógica

As notificações não são deletadas permanentemente do banco de dados. Em vez disso, são marcadas como deletadas usando o campo `deleted_at` na tabela `notification_reads` (Supabase) ou removidas da lista de notificações visíveis (localStorage).

### Execução Automática

1. **Verificação Periódica**: O sistema verifica a cada 1 hora se é domingo e se já executou a limpeza hoje.

2. **Condições para Execução**:
   - Deve ser domingo (dia da semana = 0)
   - Não deve ter executado hoje (verifica data da última limpeza no localStorage)

3. **Processo de Limpeza**:
   - Busca todos os usuários do sistema
   - Para cada usuário, busca todas as notificações
   - Marca cada notificação como deletada usando `db.deleteNotification()`
   - Salva a data da última limpeza no localStorage
   - Dispara evento para atualizar contadores de notificações

## 🛠️ Implementação Técnica

### Arquivo: `services/notificationCleanup.ts`

O serviço contém:

- **`getAllUserIds()`**: Busca todos os IDs de usuários do localStorage
- **`shouldRunCleanup()`**: Verifica se deve executar a limpeza (é domingo e não executou hoje)
- **`markAllNotificationsAsDeleted()`**: Marca todas as notificações como deletadas
- **`runAutoCleanupIfNeeded()`**: Executa a limpeza se necessário
- **`startAutoCleanupScheduler()`**: Inicia o scheduler que verifica periodicamente

### Integração no App

O scheduler é iniciado automaticamente quando o app carrega, através de um `useEffect` no `App.tsx`:

```typescript
useEffect(() => {
  const stopScheduler = startAutoCleanupScheduler();
  return () => {
    stopScheduler();
  };
}, []);
```

## 📝 Armazenamento

A data da última limpeza é armazenada no localStorage com a chave:
```
last_notification_cleanup_date
```

Isso garante que a limpeza não seja executada múltiplas vezes no mesmo domingo, mesmo se o app for recarregado.

## 🔍 Logs

O sistema registra logs no console durante a execução:

- `🧹 Iniciando limpeza automática de notificações (domingo)...`
- `✅ Limpeza automática concluída. X notificações marcadas como deletadas para Y usuário(s).`
- `❌ Erro ao executar limpeza automática de notificações: [erro]`

## ⚙️ Configuração

### Alterar o Dia da Limpeza

Para alterar o dia da semana, modifique a condição em `shouldRunCleanup()`:

```typescript
// 0 = domingo, 1 = segunda, 2 = terça, ..., 6 = sábado
if (dayOfWeek !== 0) { // Altere o número aqui
  return false;
}
```

### Alterar a Frequência de Verificação

Para alterar a frequência de verificação, modifique o intervalo em `startAutoCleanupScheduler()`:

```typescript
const interval = setInterval(() => {
  runAutoCleanupIfNeeded();
}, 3600000); // 1 hora em milissegundos (altere conforme necessário)
```

## 🔄 Reabilitar Notificações

Como a exclusão é lógica, as notificações podem ser reabilitadas. No entanto, isso requer modificação manual no banco de dados:

### Supabase

Para reabilitar notificações no Supabase, você pode:

1. Atualizar a tabela `notification_reads` para remover o `deleted_at`:
```sql
UPDATE notification_reads 
SET deleted_at = NULL 
WHERE deleted_at IS NOT NULL;
```

2. Ou deletar os registros de exclusão:
```sql
DELETE FROM notification_reads 
WHERE deleted_at IS NOT NULL;
```

### localStorage

Para reabilitar notificações no localStorage, você precisaria restaurar as notificações de um backup ou recriá-las manualmente.

## 🧪 Teste Manual

Para testar a limpeza manualmente (sem esperar domingo):

1. Abra o console do navegador
2. Execute:
```javascript
// Limpar a data da última limpeza
localStorage.removeItem('last_notification_cleanup_date');

// Alterar temporariamente a data para domingo (apenas para teste)
// Isso requer modificar o código temporariamente
```

**Nota**: Para testes, você pode modificar temporariamente a função `shouldRunCleanup()` para sempre retornar `true`, mas lembre-se de reverter após o teste.

## 📊 Impacto

- **Performance**: A limpeza é executada de forma assíncrona e não bloqueia a interface
- **Usuários**: Todos os usuários são processados sequencialmente
- **Notificações**: Apenas notificações visíveis são marcadas como deletadas (já deletadas são ignoradas)

## ⚠️ Observações Importantes

1. A limpeza é executada apenas quando o app está aberto/ativo
2. Se o usuário não abrir o app no domingo, a limpeza será executada no próximo domingo
3. A exclusão é lógica, então as notificações podem ser recuperadas se necessário
4. O sistema não deleta notificações que já foram deletadas manualmente pelo usuário (já estão marcadas como deletadas)

