-- Tabela para armazenar status de pagamento das transações por usuário
-- Execute este script no SQL Editor do Supabase

create table if not exists public.transaction_status (
  user_id text not null,
  transaction_id text not null,
  is_paid boolean not null default false,
  updated_at timestamptz default now(),
  constraint transaction_status_pk primary key (user_id, transaction_id)
);

create index if not exists idx_transaction_status_user
  on public.transaction_status (user_id);

create index if not exists idx_transaction_status_transaction
  on public.transaction_status (transaction_id);

comment on table public.transaction_status is 'Status de pagamento (pago / não pago) das transações por usuário';
comment on column public.transaction_status.user_id is 'Identificador do usuário (email ou id usado na aplicação)';
comment on column public.transaction_status.transaction_id is 'ID da transação na tabela transactions';
comment on column public.transaction_status.is_paid is 'Indica se a transação foi marcada como paga';

