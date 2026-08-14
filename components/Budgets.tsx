import React, { useMemo, useState } from 'react';
import {
  PiggyBank,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { BudgetPeriod, Category, CategoryBudget, Transaction } from '../types';
import { spentByCategory, spentByCategoryYear } from '../services/financialHealth';

interface BudgetsProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onSave: (budgets: CategoryBudget[]) => Promise<void> | void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const expenseCategories = Object.values(Category).filter((c) => c !== Category.SALARY);

function expensesInPeriod(
  transactions: Transaction[],
  category: string,
  period: BudgetPeriod
): Transaction[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return transactions
    .filter((t) => {
      if (t.type !== 'expense' || t.category !== category) return false;
      const [ty, tm] = t.date.split('-').map(Number);
      if (period === 'yearly') return ty === y;
      return ty === y && tm === m;
    })
    .sort((a, b) => b.amount - a.amount || (a.date < b.date ? 1 : -1));
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function normalizePeriod(b: CategoryBudget): BudgetPeriod {
  return b.period === 'yearly' ? 'yearly' : 'monthly';
}

const Budgets: React.FC<BudgetsProps> = ({ budgets, transactions, onSave, showToast }) => {
  const [viewPeriod, setViewPeriod] = useState<BudgetPeriod>('monthly');
  const [category, setCategory] = useState(expenseCategories[0]);
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const spentMonth = useMemo(() => spentByCategory(transactions), [transactions]);
  const spentYear = useMemo(() => spentByCategoryYear(transactions), [transactions]);

  const periodBudgets = useMemo(
    () => budgets.filter((b) => normalizePeriod(b) === viewPeriod),
    [budgets, viewPeriod]
  );

  const spent = viewPeriod === 'yearly' ? spentYear : spentMonth;

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const yearLabel = String(new Date().getFullYear());
  const periodLabel = viewPeriod === 'yearly' ? `Ano ${yearLabel}` : monthLabel;
  const limitLabel = viewPeriod === 'yearly' ? 'Limite anual (R$)' : 'Limite mensal (R$)';
  const spentLabel =
    viewPeriod === 'yearly' ? 'Já gasto no ano' : 'Já gasto no mês';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(limit.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      showToast?.('Informe um limite válido.', 'warning');
      return;
    }

    const existing = budgets.find(
      (b) => b.category === category && normalizePeriod(b) === viewPeriod
    );
    let next: CategoryBudget[];
    if (existing) {
      next = budgets.map((b) =>
        b.id === existing.id ? { ...b, monthlyLimit: value, period: viewPeriod } : b
      );
    } else {
      next = [
        ...budgets,
        {
          id: Math.random().toString(36).slice(2, 11),
          category,
          monthlyLimit: value,
          period: viewPeriod,
        },
      ];
    }

    setSaving(true);
    try {
      await onSave(next);
      setLimit('');
      showToast?.(
        existing
          ? `Orçamento ${viewPeriod === 'yearly' ? 'anual' : 'mensal'} atualizado.`
          : `Orçamento ${viewPeriod === 'yearly' ? 'anual' : 'mensal'} criado.`,
        'success'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await onSave(budgets.filter((b) => b.id !== id));
      showToast?.('Orçamento removido.', 'info');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalLimit = periodBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = periodBudgets.reduce((s, b) => s + (spent[b.category] || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-3xl p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <PiggyBank size={28} className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold">Orçamento</h3>
            <p className="text-indigo-100 text-sm mt-1">
              Separe o curto prazo (mês) do longo prazo (ano) para ter previsibilidade de verdade.
            </p>

            <div className="mt-4 inline-flex p-1 bg-white/15 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setViewPeriod('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  viewPeriod === 'monthly' ? 'bg-white text-indigo-700' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setViewPeriod('yearly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  viewPeriod === 'yearly' ? 'bg-white text-indigo-700' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                Anual
              </button>
            </div>

            <p className="text-indigo-100 text-sm mt-3 capitalize">{periodLabel}</p>
            <div className="flex flex-wrap gap-6 mt-2 text-sm">
              <div>
                <p className="opacity-80">Limite total</p>
                <p className="text-lg font-bold">
                  R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="opacity-80">{spentLabel}</p>
                <p className="text-lg font-bold">
                  R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="opacity-80">Disponível</p>
                <p className="text-lg font-bold">
                  R${' '}
                  {Math.max(0, totalLimit - totalSpent).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 md:items-end"
      >
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {expenseCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            {limitLabel}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder={viewPeriod === 'yearly' ? 'Ex: 12000' : 'Ex: 800'}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus size={18} />
          Salvar {viewPeriod === 'yearly' ? 'anual' : 'mensal'}
        </button>
      </form>

      {periodBudgets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-16 text-center text-slate-400">
          <p className="font-medium">
            Nenhum orçamento {viewPeriod === 'yearly' ? 'anual' : 'mensal'} ainda.
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            {viewPeriod === 'yearly'
              ? 'Use o anual para tetos grandes (ex.: viagem, reforma, carro) e acompanhar o ano inteiro.'
              : 'Use o mensal para o dia a dia (alimentação, lazer, transporte).'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periodBudgets.map((b) => {
            const used = spent[b.category] || 0;
            const pct = b.monthlyLimit > 0 ? Math.min(100, (used / b.monthlyLimit) * 100) : 0;
            const over = used > b.monthlyLimit;
            const warn = !over && pct >= 80;
            const items = expensesInPeriod(transactions, b.category, viewPeriod);
            const open = expandedIds.has(b.id);

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
              >
                <div className="p-4 flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(b.id)}
                    className="flex-1 min-w-0 text-left space-y-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {b.category}
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {viewPeriod === 'yearly' ? 'Anual' : 'Mensal'}
                      </span>
                      {open ? (
                        <ChevronUp size={16} className="text-slate-400 shrink-0 ml-auto" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400 shrink-0 ml-auto" />
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      R$ {used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de{' '}
                      R$ {b.monthlyLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          over ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      {over ? (
                        <>
                          <AlertTriangle size={14} className="text-red-500" />
                          <span className="text-red-600">
                            Estourou em R${' '}
                            {(used - b.monthlyLimit).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </>
                      ) : warn ? (
                        <>
                          <AlertTriangle size={14} className="text-amber-500" />
                          <span className="text-amber-600">
                            {pct.toFixed(0)}% usado — atenção
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-emerald-600">
                            Dentro do limite ({pct.toFixed(0)}%)
                          </span>
                        </>
                      )}
                    </div>
                    {!open && (
                      <p className="text-[11px] text-slate-400">
                        Toque para ver os {items.length || 0} gasto(s)
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg shrink-0"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {open && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800 pt-3 space-y-1.5 max-h-56 overflow-y-auto">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                      Gastos {viewPeriod === 'yearly' ? 'do ano' : 'do mês'} ({items.length})
                    </p>
                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">
                        Nenhum gasto nesta categoria neste período.
                      </p>
                    ) : (
                      <>
                        {items.map((t) => {
                          const share = used > 0 ? (t.amount / used) * 100 : 0;
                          return (
                            <div
                              key={t.id}
                              className="flex items-start justify-between gap-2 text-sm rounded-lg px-2 py-1.5 bg-slate-50 dark:bg-slate-800/60"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">
                                  {t.description || 'Sem descrição'}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {formatDate(t.date)}
                                  {share >= 15 ? ` · ${share.toFixed(0)}% do total` : ''}
                                </p>
                              </div>
                              <span className="font-semibold text-red-600 shrink-0">
                                R${' '}
                                {t.amount.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          );
                        })}
                        {items.length > 1 && (
                          <p className="text-[11px] text-slate-400 pt-1">
                            Do maior para o menor — comece pelos primeiros para ajustar.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Budgets;
