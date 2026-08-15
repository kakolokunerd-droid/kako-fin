-- Orçamentos por categoria e mês (YYYY-MM)
-- O orçamento anual é a soma dos meses do ano.
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL DEFAULT 0,
  year_month TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT budgets_pk PRIMARY KEY (user_id, id)
);

-- Migração se a tabela já existia:
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS year_month TEXT;

-- Preenche mês atual onde estiver vazio (orçamentos antigos)
UPDATE public.budgets
SET year_month = to_char(NOW(), 'YYYY-MM')
WHERE year_month IS NULL OR year_month = '';

ALTER TABLE public.budgets
  ALTER COLUMN year_month SET DEFAULT to_char(NOW(), 'YYYY-MM');

CREATE INDEX IF NOT EXISTS idx_budgets_user ON public.budgets (user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON public.budgets (user_id, year_month);

COMMENT ON TABLE public.budgets IS 'Limites de orçamento por categoria e mês (YYYY-MM)';
COMMENT ON COLUMN public.budgets.monthly_limit IS 'Limite da categoria no mês';
COMMENT ON COLUMN public.budgets.year_month IS 'Mês do orçamento no formato YYYY-MM';

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on budgets" ON public.budgets;
CREATE POLICY "Allow all operations on budgets"
  ON public.budgets FOR ALL
  USING (true)
  WITH CHECK (true);
