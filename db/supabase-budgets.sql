-- Orçamentos por categoria (mensal e anual)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT budgets_pk PRIMARY KEY (user_id, id)
);

-- Se a tabela já existia sem a coluna period:
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'monthly';

CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets (user_id);

COMMENT ON TABLE public.budgets IS 'Limites de orçamento por categoria (mensal ou anual)';
COMMENT ON COLUMN public.budgets.monthly_limit IS 'Valor do limite no período (mês ou ano)';
COMMENT ON COLUMN public.budgets.period IS 'monthly | yearly';

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on budgets" ON public.budgets;
CREATE POLICY "Allow all operations on budgets"
  ON public.budgets FOR ALL
  USING (true)
  WITH CHECK (true);
