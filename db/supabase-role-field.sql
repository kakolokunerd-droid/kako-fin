-- Adicionar campo role na tabela profiles
-- Execute este script no SQL Editor do Supabase Dashboard

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Comentário explicativo
COMMENT ON COLUMN profiles.role IS 'Papel do usuário: admin ou user';

-- Atualizar usuários existentes para ter role 'user' por padrão (se ainda não tiverem)
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL;

