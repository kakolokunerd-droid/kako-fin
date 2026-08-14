-- LEGADO: contas recorrentes mensais.
-- O app passou a usar Contas longas / parcelamentos (veja supabase-installments.sql).
-- Receitas e despesas mensais continuam em Transações (com clonar mês).
--
-- Se você já criou estas tabelas e não usa mais, pode ignorá-las.
-- Mantido apenas para referência / migração manual se necessário.

-- CREATE TABLE IF NOT EXISTS public.recurring_bills (...);
-- CREATE TABLE IF NOT EXISTS public.bill_payments (...);
