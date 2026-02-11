import { useMemo } from "react";
import { AuthState } from "../types";
import type { SubscriptionPlan } from "../types";

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  isTrial: boolean;
  isActive: boolean;
  canAccessReports: boolean;      // Apenas premium_plus
  canAccessInsights: boolean;      // Apenas premium_plus
  canAccessGoals: boolean;         // Premium e premium_plus (não basic)
  canAccessKanban: boolean;        // Apenas premium_plus
  canSendQuotes: boolean;          // Premium e premium_plus (não basic)
  daysRemaining: number;
}

export function useSubscription(auth: AuthState): SubscriptionInfo {
  const subscription = useMemo(() => {
    if (!auth.user) {
      return {
        plan: "trial" as SubscriptionPlan,
        isTrial: true,
        isActive: false,
        canAccessReports: false,
        canAccessInsights: false,
        canAccessGoals: false,
        canAccessKanban: false,
        canSendQuotes: false,
        daysRemaining: 0,
      };
    }

    const user = auth.user;
    const plan = (user.subscriptionPlan || "trial") as SubscriptionPlan;
    const isTrial = plan === "trial";

    // Trial é gratuito permanente (sem vencimento)
    const daysRemaining = isTrial ? -1 : 0; // -1 indica permanente

    // Verificar se está ativo
    // Trial sempre ativo (gratuito permanente)
    // Outros planos verificam expiração
    const isActive =
      isTrial ||
      (user.subscriptionExpiresAt &&
        new Date(user.subscriptionExpiresAt) > new Date());

    // Permissões baseadas no plano conforme tabela:
    // Trial: Dashboard, Transações, Compras, Notificações, Perfil (SEM Metas, Insights, Relatórios)
    // Basic: Tudo do Trial + Metas
    // Premium: Tudo do Basic (sem mudanças)
    // Premium Plus: Tudo do Premium + Insights + Relatórios
    
    const canAccessReports = plan === "premium_plus";
    const canAccessInsights = plan === "premium_plus";
    const canAccessGoals = plan !== "trial"; // Basic, Premium e Premium Plus
    const canAccessKanban = plan === "premium_plus";
    const canSendQuotes = plan !== "trial" && plan !== "basic"; // Premium e Premium Plus

    return {
      plan,
      isTrial,
      isActive,
      canAccessReports,
      canAccessInsights,
      canAccessGoals,
      canAccessKanban,
      canSendQuotes,
      daysRemaining,
    };
  }, [auth.user]);

  return subscription;
}
