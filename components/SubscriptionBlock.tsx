import React from "react";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { AuthState } from "../types";

interface SubscriptionBlockProps {
  feature: "reports" | "insights" | "goals" | "kanban" | "send_quotes";
  auth: AuthState;
  children?: React.ReactNode;
}

const featureNames = {
  reports: "Relatórios",
  insights: "Insights com IA",
  goals: "Metas Financeiras",
  kanban: "Gerenciar Orçamentos",
  send_quotes: "Enviar Relatórios",
};

const featureDescriptions = {
  reports:
    "Acesse relatórios completos e análises avançadas com o plano Premium Plus.",
  insights:
    "Acesse insights inteligentes com IA para otimizar suas finanças no plano Premium Plus.",
  goals:
    "Crie e gerencie metas financeiras com os planos Premium ou Premium Plus.",
  kanban: "Gerencie seus orçamentos com o Kanban board no plano Premium Plus.",
  send_quotes:
    "Envie relatórios por email e WhatsApp com os planos Premium ou Premium Plus.",
};

export default function SubscriptionBlock({
  feature,
  auth,
  children,
}: SubscriptionBlockProps) {
  const subscription = useSubscription(auth);

  const isBlocked =
    (feature === "reports" && !subscription.canAccessReports) ||
    (feature === "insights" && !subscription.canAccessInsights) ||
    (feature === "goals" && !subscription.canAccessGoals) ||
    (feature === "kanban" && !subscription.canAccessKanban) ||
    (feature === "send_quotes" && !subscription.canSendQuotes);

  if (!isBlocked) {
    return <>{children}</>;
  }

  const handleGoToPricing = () => {
    // Mudar para a tab 'pricing' via evento customizado
    const event = new CustomEvent('change-tab', { detail: 'pricing' });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white rounded-2xl shadow-md border border-gray-200">
      <div className="bg-teal-100 p-4 rounded-full mb-4">
        <Lock className="w-12 h-12 text-teal-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        {featureNames[feature]} Disponível em Planos Superiores
      </h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        {featureDescriptions[feature]}
      </p>
      <button
        onClick={handleGoToPricing}
        className="flex items-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
      >
        <Crown className="w-5 h-5" />
        Ver Planos Disponíveis
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
