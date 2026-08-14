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

    // Trial sempre ativo; planos pagos: ativo se sem data de expiração ou data futura
    const isActive =
      isTrial ||
      !user.subscriptionExpiresAt ||
      new Date(user.subscriptionExpiresAt) > new Date();

    // Ajudar primeiro: metas, orçamento e contas liberados para todos
    // Relatórios e Insights IA continuam no Premium Plus
    const canAccessReports = plan === "premium_plus";
    const canAccessInsights = plan === "premium_plus";
    const canAccessGoals = true;
    const canAccessKanban = plan === "premium_plus";
    const canSendQuotes = plan === "premium_plus";

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
