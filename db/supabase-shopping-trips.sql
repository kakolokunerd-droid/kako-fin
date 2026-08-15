-- Compras: idas (carrinho) + produtos
-- Execute no SQL Editor do Supabase
-- Substitui o uso do modelo antigo "shopping" (um item = uma compra)

CREATE TABLE IF NOT EXISTS public.shopping_trips (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trip_date DATE NOT NULL,
  category TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'market' CHECK (kind IN ('market', 'occasional')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  notes TEXT,
  synced_to_transactions BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shopping_trips_pk PRIMARY KEY (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.shopping_lines (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  trip_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  stock_status TEXT NOT NULL DEFAULT 'have' CHECK (stock_status IN ('have', 'low', 'out')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT shopping_lines_pk PRIMARY KEY (user_id, id)
);

-- Se a tabela já existia sem a coluna:
ALTER TABLE public.shopping_lines
  ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'have';

CREATE INDEX IF NOT EXISTS idx_shopping_trips_user ON public.shopping_trips (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_trips_date ON public.shopping_trips (user_id, trip_date);
CREATE INDEX IF NOT EXISTS idx_shopping_lines_user ON public.shopping_lines (user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lines_trip ON public.shopping_lines (user_id, trip_id);

ALTER TABLE public.shopping_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on shopping_trips" ON public.shopping_trips;
CREATE POLICY "Allow all operations on shopping_trips"
  ON public.shopping_trips FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on shopping_lines" ON public.shopping_lines;
CREATE POLICY "Allow all operations on shopping_lines"
  ON public.shopping_lines FOR ALL
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.shopping_trips IS 'Idas às compras / carrinhos (mercado, gastos avulsos)';
COMMENT ON TABLE public.shopping_lines IS 'Produtos dentro de cada carrinho';
