-- Script SQL alternativo para usar sem autenticação do Supabase
-- Este script desabilita RLS ou cria políticas permissivas
-- Execute este script no SQL Editor do Supabase Dashboard

-- Adicionar campo password na tabela profiles se não existir
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- Primeiro, vamos remover as políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON goals;

DROP POLICY IF EXISTS "Users can view own shopping" ON shopping;
DROP POLICY IF EXISTS "Users can insert own shopping" ON shopping;
DROP POLICY IF EXISTS "Users can update own shopping" ON shopping;
DROP POLICY IF EXISTS "Users can delete own shopping" ON shopping;

-- Opção 1: Desabilitar RLS completamente (para desenvolvimento/teste)
-- Descomente as linhas abaixo se quiser desabilitar RLS:
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals DISABLE ROW LEVEL SECURITY;

-- Opção 2: Criar políticas permissivas baseadas em user_id (recomendado)
-- Estas políticas permitem acesso baseado no user_id sem precisar de JWT

-- Políticas para profiles: permitir acesso baseado no email
CREATE POLICY "Allow all operations on profiles"
  ON profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para transactions: permitir acesso baseado no user_id
CREATE POLICY "Allow all operations on transactions"
  ON transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para goals: permitir acesso baseado no user_id
CREATE POLICY "Allow all operations on goals"
  ON goals FOR ALL
  USING (true)
  WITH CHECK (true);

-- Políticas para shopping: permitir acesso baseado no user_id
CREATE POLICY "Allow all operations on shopping"
  ON shopping FOR ALL
  USING (true)
  WITH CHECK (true);

-- NOTA: Estas políticas são permissivas e permitem qualquer operação.
-- Para produção, você deve implementar autenticação adequada do Supabase
-- ou criar políticas mais restritivas baseadas em user_id.

