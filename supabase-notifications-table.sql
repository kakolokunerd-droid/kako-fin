-- Tabela de Notificações
-- Execute este script no SQL Editor do Supabase para criar a tabela de notificações

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Tabela para rastrear quais notificações foram lidas por cada usuário
CREATE TABLE IF NOT EXISTS notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(notification_id, user_id)
);

-- Índices para notification_reads
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON notification_reads(notification_id);

-- Comentários nas tabelas
COMMENT ON TABLE notifications IS 'Tabela de notificações criadas pelos administradores';
COMMENT ON TABLE notification_reads IS 'Tabela para rastrear quais notificações foram lidas por cada usuário';

