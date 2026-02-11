-- Adicionar campo de última contribuição na tabela profiles
-- Execute este script no SQL Editor do Supabase Dashboard

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_contribution_date TIMESTAMP WITH TIME ZONE;

-- Comentário explicativo
COMMENT ON COLUMN profiles.last_contribution_date IS 'Data da última contribuição do usuário para manutenção do app';

