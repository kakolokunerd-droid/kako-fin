import React from "react";
import { Zap, Star, Crown, Check, ArrowLeft, Sparkles } from "lucide-react";
import { SubscriptionPlan } from "../types";

interface PricingProps {
  onBack: () => void;
  onSelectPlan: (plan: 'trial' | 'basic' | 'premium' | 'premium_plus') => void;
  mode?: 'signup' | 'change';
  currentPlan?: SubscriptionPlan;
}

export default function Pricing({ onBack, onSelectPlan, mode = 'signup', currentPlan }: PricingProps) {
  const plans = [
    {
      id: 'basic' as const,
      name: 'Basic',
      price: '4,99',
      icon: Zap,
      iconColor: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      description: 'Ideal para começar',
      features: [
        'Dashboard completo com gráficos',
        'Gerenciar receitas e despesas',
        'Lista de compras',
        'Sincronização em nuvem',
        'Notificações',
        'Perfil e configurações',
      ],
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      price: '9,99',
      icon: Star,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      description: 'Mais Popular',
      popular: true,
      features: [
        'Tudo do plano Básico',
        'Metas financeiras',
        'Histórico completo',
        'Suporte',
      ],
    },
    {
      id: 'premium_plus' as const,
      name: 'Premium Plus',
      price: '19,99',
      icon: Crown,
      iconColor: 'text-teal-500',
      bgColor: 'bg-teal-50',
      description: 'Máximo desempenho',
      features: [
        'Tudo do plano Premium',
        'Insights com IA',
        'Relatórios completos e análises avançadas',
        'Exportação de dados (PDF, DOCX, XLSX)',
        'Análises comparativas',
        'Suporte Prioritário 24/7',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold">Voltar</span>
          </button>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">
              {mode === 'change' ? 'Trocar de Plano' : 'Escolha o Plano Ideal para Você'}
            </h1>
            <p className="text-lg text-slate-600">
              {mode === 'change' 
                ? currentPlan 
                  ? `Seu plano atual: ${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1).replace('_', ' ')}`
                  : 'Escolha um novo plano para sua conta'
                : 'Escolha o plano ideal ou comece com o plano Trial gratuito'}
            </p>
          </div>
        </div>

        {/* Banner de Trial */}
        <div className="mb-12 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-white/20 p-3 rounded-xl">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold">Plano Trial - Gratuito Permanente</h2>
          </div>
          <p className="text-teal-50 text-lg mb-6 max-w-2xl">
            Comece a usar agora mesmo sem compromisso. Plano gratuito permanente, sem vencimento.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Gratuito para sempre</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Sem vencimento</span>
            </div>
          </div>
          <button
            onClick={() => onSelectPlan('trial')}
            className="bg-white text-teal-600 font-bold px-8 py-4 rounded-xl hover:bg-teal-50 transition-colors shadow-lg"
          >
            Começar Agora - Grátis
          </button>
        </div>

        {/* Grid de Planos */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                  plan.popular
                    ? 'border-purple-500 scale-105'
                    : 'border-slate-200'
                } overflow-hidden transition-transform hover:scale-105`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 text-sm font-bold rounded-bl-xl">
                    Mais Popular
                  </div>
                )}
                <div className={`${plan.bgColor} p-6`}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`${plan.iconColor} bg-white p-3 rounded-xl shadow-md`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-slate-600 text-sm">{plan.description}</p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">R$ {plan.price}</span>
                    <span className="text-slate-600">/mês</span>
                  </div>
                </div>
                <div className="p-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                      plan.id === currentPlan
                        ? 'bg-teal-500 text-white hover:bg-teal-600'
                        : plan.popular
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                    disabled={plan.id === currentPlan}
                  >
                    {plan.id === currentPlan ? 'Plano Atual' : mode === 'change' ? 'Trocar para Este Plano' : 'Escolher Plano'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Seção Final */}
        <div className="bg-white rounded-2xl p-8 shadow-md border border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-4 text-center">
            Sobre o Plano Trial
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Gratuito permanente</h4>
              <p className="text-slate-600 text-sm">
                Plano Trial é gratuito para sempre, sem vencimento
              </p>
            </div>
            <div>
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Sem cartão de crédito</h4>
              <p className="text-slate-600 text-sm">
                Comece a usar sem precisar informar dados de pagamento
              </p>
            </div>
            <div>
              <div className="bg-teal-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-teal-600" />
              </div>
              <h4 className="font-bold text-slate-900 mb-2">Funcionalidades básicas</h4>
              <p className="text-slate-600 text-sm">
                Dashboard, Transações, Compras, Notificações e Perfil
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
