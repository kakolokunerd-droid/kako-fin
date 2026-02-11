# 💳 Sistema de Planos de Assinatura

Este documento descreve o sistema completo de planos de assinatura implementado no Kako Fin.

---

## 📋 Visão Geral

O sistema de assinatura permite que os usuários escolham entre diferentes planos com funcionalidades variadas. Todos os planos começam com um **trial gratuito de 30 dias** sem necessidade de cartão de crédito.

---

## 🎯 Planos Disponíveis

### 1. **Trial** (Gratuito - 30 dias)
- Acesso completo a todas as funcionalidades
- Sem cartão de crédito necessário
- Cancele quando quiser

### 2. **Basic** (R$ 4,99/mês)
- Criar e editar produtos
- Gerenciar clientes
- Criar orçamentos
- Visualizar orçamentos
- Dashboard básico

### 3. **Premium** (R$ 9,99/mês) - Mais Popular
- Tudo do plano Básico
- Enviar orçamentos por email/WhatsApp
- Kanban de orçamentos
- Histórico completo
- Suporte

### 4. **Premium Plus** (R$ 19,99/mês)
- Tudo do plano Premium
- Relatórios completos
- Gerenciar orçamentos (Kanban)
- Exportação de dados (PDF, DOCX, XLSX)
- Análises avançadas
- Suporte Prioritário

**⚠️ IMPORTANTE:** Todos os planos são para **1 usuário apenas**. O Premium Plus NÃO inclui funcionalidade de múltiplos usuários.

---

## 🗄️ Estrutura do Banco de Dados

### Campos Adicionados na Tabela `profiles`

```sql
subscription_plan TEXT DEFAULT 'trial'
  CHECK (subscription_plan IN ('trial', 'basic', 'premium', 'premium_plus'))

subscription_started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()

subscription_expires_at TIMESTAMP WITH TIME ZONE

is_trial_active BOOLEAN DEFAULT true
```

### Script SQL

Execute o script `db/supabase-subscription-fields.sql` no SQL Editor do Supabase para adicionar os campos necessários.

---

## 🔧 Componentes e Hooks

### 1. Hook `useSubscription`

Localização: `hooks/useSubscription.ts`

Retorna informações sobre a assinatura do usuário:

```typescript
{
  plan: 'trial' | 'basic' | 'premium' | 'premium_plus',
  isTrial: boolean,
  isActive: boolean,
  canAccessReports: boolean,      // Apenas premium_plus
  canAccessKanban: boolean,        // Apenas premium_plus
  canSendQuotes: boolean,          // Premium e premium_plus (não basic)
  daysRemaining: number            // Dias restantes do trial
}
```

**Uso:**
```typescript
import { useSubscription } from '../hooks/useSubscription';
import { AuthState } from '../types';

const subscription = useSubscription(auth);
```

### 2. Componente `SubscriptionBlock`

Localização: `components/SubscriptionBlock.tsx`

Bloqueia features baseado no plano do usuário e mostra uma mensagem de upgrade.

**Uso:**
```typescript
<SubscriptionBlock feature="reports" auth={auth}>
  {/* Conteúdo que só aparece para premium_plus */}
</SubscriptionBlock>
```

**Features suportadas:**
- `"reports"` - Relatórios (apenas premium_plus)
- `"kanban"` - Gerenciar Orçamentos (apenas premium_plus)
- `"send_quotes"` - Enviar Orçamentos (premium e premium_plus)

### 3. Página `Pricing`

Localização: `components/Pricing.tsx`

Página completa de planos com:
- Banner de trial destacado
- Grid de 3 planos
- Informações sobre o trial
- Botões para selecionar planos

**Acesso:**
- Via tab `pricing` no app
- Via evento customizado `change-tab` com detail `'pricing'`

---

## 🔄 Fluxo de Cadastro com Plano

### 1. Seleção de Plano

O usuário pode selecionar um plano de duas formas:

**A) Via página Pricing:**
- Acessa a tab `pricing`
- Clica em "Começar Teste Grátis" ou "Escolher Plano"
- É redirecionado para o formulário de cadastro

**B) Via URL:**
- Acessa `/signup?plan=trial` (ou `basic`, `premium`, `premium_plus`)
- O parâmetro é capturado automaticamente
- O formulário mostra um badge indicando o plano selecionado

### 2. Criação da Conta

Ao criar a conta, o sistema:
1. Verifica se o usuário já existe
2. Cria o perfil com o plano selecionado (ou `trial` se nenhum foi escolhido)
3. Define `is_trial_active = true` (todos começam com trial)
4. Define `subscription_started_at` como a data atual
5. Define `subscription_expires_at = null` (trial não expira automaticamente)

**Código:**
```typescript
const newUser: UserProfile = { 
  name, 
  email, 
  currency: 'BRL', 
  role: 'user',
  subscriptionPlan: finalPlan, // 'trial' ou plano selecionado
  subscriptionStartedAt: now,
  subscriptionExpiresAt: null,
  isTrialActive: true,
};
```

---

## 🚫 Bloqueio de Features

### Relatórios

O componente `Reports` está protegido com `SubscriptionBlock`:

```typescript
<SubscriptionBlock feature="reports" auth={auth}>
  {/* Conteúdo dos relatórios */}
</SubscriptionBlock>
```

**Permissão:** Apenas `premium_plus` pode acessar.

### Outras Features

Para adicionar bloqueios em outras features:

```typescript
import SubscriptionBlock from './components/SubscriptionBlock';

<SubscriptionBlock feature="kanban" auth={auth}>
  {/* Conteúdo do Kanban */}
</SubscriptionBlock>

<SubscriptionBlock feature="send_quotes" auth={auth}>
  {/* Botão de enviar orçamentos */}
</SubscriptionBlock>
```

---

## 📝 Atualização Manual de Planos

### Via SQL

```sql
-- Atualizar plano de um usuário específico por EMAIL
UPDATE profiles
SET
  subscription_plan = 'premium_plus',
  subscription_started_at = NOW(),
  subscription_expires_at = NULL, -- NULL para trial, ou adicione data de expiração
  is_trial_active = false -- false para planos pagos, true para trial
WHERE email = 'email@exemplo.com';

-- Verificar plano atual
SELECT
  email,
  name,
  subscription_plan,
  subscription_started_at,
  subscription_expires_at,
  is_trial_active
FROM profiles
WHERE email = 'email@exemplo.com';
```

### Via Código (Futuro)

Você pode criar uma função no `db.ts` para atualizar planos:

```typescript
async updateSubscription(
  email: string, 
  plan: SubscriptionPlan, 
  expiresAt?: string | null
): Promise<void> {
  // Implementação
}
```

---

## 🎨 Interface do Usuário

### Página de Pricing

- **Header:** Título e subtítulo
- **Banner de Trial:** Destaque com gradiente teal
- **Grid de Planos:** 3 cards lado a lado (responsivo)
- **Badge "Mais Popular":** No plano Premium
- **Seção Final:** Informações sobre o trial

### Formulário de Cadastro

- **Badge de Plano:** Mostra qual plano foi selecionado
- **Texto:** "✨ 30 dias grátis selecionado" ou "Plano [Nome] selecionado"

### Bloqueio de Features

- **Ícone:** Lock em círculo teal
- **Título:** "[Feature] Disponível em Planos Superiores"
- **Descrição:** Explicação do que é necessário
- **Botão CTA:** "Ver Planos Disponíveis" que redireciona para pricing

---

## 🔍 Verificação de Permissões

### No Código

```typescript
import { useSubscription } from '../hooks/useSubscription';

const subscription = useSubscription(auth);

if (subscription.canAccessReports) {
  // Mostrar relatórios
}

if (subscription.canSendQuotes) {
  // Mostrar botão de enviar
}

if (subscription.isTrial) {
  // Mostrar dias restantes
  console.log(`${subscription.daysRemaining} dias restantes`);
}
```

---

## 📊 Estrutura de Dados

### UserProfile (TypeScript)

```typescript
export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  currency: string;
  lastContributionDate?: string;
  role?: UserRole;
  // Campos de assinatura
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string | null;
  isTrialActive?: boolean;
}
```

### SubscriptionPlan (TypeScript)

```typescript
export type SubscriptionPlan = 'trial' | 'basic' | 'premium' | 'premium_plus';
```

---

## 🚀 Próximos Passos (Futuro)

1. **Sistema de Pagamento:**
   - Integração com gateway de pagamento (Stripe, Mercado Pago, etc.)
   - Webhook para atualizar planos automaticamente

2. **Expiração Automática:**
   - Job/cron para verificar expirações
   - Notificação antes de expirar
   - Downgrade automático após expiração

3. **Histórico de Assinaturas:**
   - Tabela separada para histórico
   - Log de mudanças de plano

4. **Renovação:**
   - Sistema de renovação automática
   - Lembretes de renovação

5. **Cancelamento:**
   - Interface para cancelar assinatura
   - Acesso até o fim do período pago

---

## ✅ Checklist de Implementação

- [x] Adicionar campos de assinatura na tabela `profiles` (SQL)
- [x] Criar página `/pricing` com todos os planos
- [x] Atualizar tipos TypeScript (`UserProfile` e `SubscriptionPlan`)
- [x] Criar hook `useSubscription` (buscar de `user`, não `company`)
- [x] Criar componente `SubscriptionBlock`
- [x] Integrar seleção de plano no `Signup`
- [x] Atualizar função `signUp` para salvar plano em `profiles`
- [x] Atualizar `useAuth` para carregar campos de assinatura do `profiles`
- [x] Implementar lógica de permissões baseada no plano
- [x] Adicionar bloqueios de features onde necessário
- [x] Testar fluxo completo de trial → plano pago

---

## 📚 Arquivos Relacionados

- `db/supabase-subscription-fields.sql` - Script SQL para adicionar campos
- `types.ts` - Tipos TypeScript (`SubscriptionPlan`, `UserProfile`)
- `hooks/useSubscription.ts` - Hook para verificar assinatura
- `components/SubscriptionBlock.tsx` - Componente de bloqueio
- `components/Pricing.tsx` - Página de planos
- `services/db.ts` - Funções de banco de dados (atualizadas)
- `App.tsx` - Lógica de signup e roteamento (atualizado)
- `components/Reports.tsx` - Exemplo de uso do `SubscriptionBlock`

---

**Última atualização:** Janeiro 2025
