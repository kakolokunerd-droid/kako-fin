-- Adicionar valor efetivamente pago/recebido nas transações
-- Execute no SQL Editor do Supabase

ALTER TABLE public.transaction_status
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC;

COMMENT ON COLUMN public.transaction_status.paid_amount IS
  'Valor efetivamente pago/recebido. Se NULL e is_paid=true, assume o valor integral da transação.';
