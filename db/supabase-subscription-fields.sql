-- Adicionar campos de assinatura na tabela profiles
-- Execute este script no SQL Editor do Supabase

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'trial'
  CHECK (subscription_plan IN ('trial', 'basic', 'premium', 'premium_plus')),
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT true;

-- Criar índice para melhor performance em consultas de assinatura
CREATE INDEX IF NOT EXISTS idx_profiles_subscription
  ON profiles(subscription_plan, subscription_expires_at);

-- Comentários para documentação
COMMENT ON COLUMN profiles.subscription_plan IS 'Plano de assinatura: trial, basic, premium, premium_plus';
COMMENT ON COLUMN profiles.subscription_started_at IS 'Data de início da assinatura/trial';
COMMENT ON COLUMN profiles.subscription_expires_at IS 'Data de expiração da assinatura (NULL para trial)';
COMMENT ON COLUMN profiles.is_trial_active IS 'Indica se o trial está ativo';
