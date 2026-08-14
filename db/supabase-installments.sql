-- Contas longas / parcelamentos (financiamentos, empréstimos, compras parceladas)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.installment_plans (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  total_installments INTEGER NOT NULL CHECK (total_installments >= 1),
  start_year_month TEXT NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  paid_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT installment_plans_pk PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_installment_plans_user ON public.installment_plans (user_id);

COMMENT ON TABLE public.installment_plans IS 'Parcelamentos e contas longas (carro, empréstimo, etc.)';

-- Mesmo padrão do restante do app (anon key sem JWT):
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on installment_plans" ON public.installment_plans;
CREATE POLICY "Allow all operations on installment_plans"
  ON public.installment_plans FOR ALL
  USING (true)
  WITH CHECK (true);
