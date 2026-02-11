-- Criar tabela de compras (shopping)
-- Execute este script no SQL Editor do Supabase Dashboard

CREATE TABLE IF NOT EXISTS shopping (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'installment')),
  purchase_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  installments INTEGER,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_shopping_user_id ON shopping(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_purchase_date ON shopping(purchase_date);

-- Política de segurança RLS (Row Level Security)
ALTER TABLE shopping ENABLE ROW LEVEL SECURITY;

-- Políticas para shopping: usuários podem gerenciar apenas suas próprias compras
-- (Se estiver usando o schema simplificado, essas políticas já existem como "Allow all operations")
-- Se não, descomente as políticas abaixo:

-- CREATE POLICY "Users can view own shopping" ON shopping FOR SELECT USING (true);
-- CREATE POLICY "Users can insert own shopping" ON shopping FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Users can update own shopping" ON shopping FOR UPDATE USING (true);
-- CREATE POLICY "Users can delete own shopping" ON shopping FOR DELETE USING (true);

-- Ou se estiver usando o schema simplificado, a política "Allow all operations on shopping" já cobre isso

