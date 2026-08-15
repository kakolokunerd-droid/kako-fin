import React, { useMemo, useState } from 'react';
import {
  PiggyBank,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  X,
} from 'lucide-react';
import { Category, CategoryBudget, Transaction } from '../types';
import { currentYearMonth, spentByCategory, spentByCategoryYear } from '../services/financialHealth';
import FormSelect from './FormSelect';
import MonthPicker from './MonthPicker';

interface BudgetsProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onSave: (budgets: CategoryBudget[]) => Promise<void> | void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

type ViewMode = 'monthly' | 'yearly';

const expenseCategories = Object.values(Category).filter((c) => c !== Category.SALARY);

function formatYmLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function expensesForMonth(transactions: Transaction[], category: string, ym: string): Transaction[] {
  const [y, m] = ym.split('-').map(Number);
  return transactions
    .filter((t) => {
      if (t.type !== 'expense' || t.category !== category) return false;
      const [ty, tm] = t.date.split('-').map(Number);
      return ty === y && tm === m;
    })
    .sort((a, b) => b.amount - a.amount || (a.date < b.date ? 1 : -1));
}

function expensesForYear(transactions: Transaction[], category: string, year: string): Transaction[] {
  return transactions
    .filter((t) => {
      if (t.type !== 'expense' || t.category !== category) return false;
      return t.date.startsWith(`${year}-`);
    })
    .sort((a, b) => b.amount - a.amount || (a.date < b.date ? 1 : -1));
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

function prevYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const Budgets: React.FC<BudgetsProps> = ({ budgets, transactions, onSave, showToast }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [category, setCategory] = useState(expenseCategories[0]);
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [formMonth, setFormMonth] = useState(currentYearMonth());

  const selectedYear = selectedMonth.slice(0, 4);
  const [yNum, mNum] = selectedMonth.split('-').map(Number);

  const spentMonth = useMemo(
    () => spentByCategory(transactions, yNum, mNum),
    [transactions, yNum, mNum]
  );
  const spentYear = useMemo(
    () => spentByCategoryYear(transactions, Number(selectedYear)),
    [transactions, selectedYear]
  );

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.yearMonth === selectedMonth),
    [budgets, selectedMonth]
  );

  const yearBudgets = useMemo(
    () => budgets.filter((b) => b.yearMonth?.startsWith(selectedYear)),
    [budgets, selectedYear]
  );

  /** Anual = soma dos limites mensais por categoria */
  const yearlyByCategory = useMemo(() => {
    const map: Record<
      string,
      { category: string; limit: number; months: CategoryBudget[] }
    > = {};
    for (const b of yearBudgets) {
      if (!map[b.category]) {
        map[b.category] = { category: b.category, limit: 0, months: [] };
      }
      map[b.category].limit += b.monthlyLimit;
      map[b.category].months.push(b);
    }
    return Object.values(map).sort((a, b) => b.limit - a.limit);
  }, [yearBudgets]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(limit.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      showToast?.('Informe um limite válido.', 'warning');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(formMonth)) {
      showToast?.('Selecione o mês do orçamento.', 'warning');
      return;
    }

    const existing = budgets.find(
      (b) => b.category === category && b.yearMonth === formMonth
    );
    let next: CategoryBudget[];
    if (existing) {
      next = budgets.map((b) =>
        b.id === existing.id ? { ...b, monthlyLimit: value, yearMonth: formMonth } : b
      );
    } else {
      next = [
        ...budgets,
        {
          id: Math.random().toString(36).slice(2, 11),
          category,
          monthlyLimit: value,
          yearMonth: formMonth,
        },
      ];
    }

    setSaving(true);
    try {
      await onSave(next);
      setLimit('');
      setShowModal(false);
      setSelectedMonth(formMonth);
      showToast?.(
        existing
          ? `Orçamento de ${formatYmLabel(formMonth)} atualizado.`
          : `Orçamento de ${formatYmLabel(formMonth)} criado.`,
        'success'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreviousMonth = async () => {
    const prev = prevYearMonth(selectedMonth);
    const source = budgets.filter((b) => b.yearMonth === prev);
    if (source.length === 0) {
      showToast?.(`Não há orçamento em ${formatYmLabel(prev)} para copiar.`, 'info');
      return;
    }

    let next = [...budgets];
    let added = 0;
    for (const s of source) {
      const exists = next.find(
        (b) => b.category === s.category && b.yearMonth === selectedMonth
      );
      if (exists) {
        next = next.map((b) =>
          b.id === exists.id ? { ...b, monthlyLimit: s.monthlyLimit } : b
        );
      } else {
        next.push({
          id: Math.random().toString(36).slice(2, 11),
          category: s.category,
          monthlyLimit: s.monthlyLimit,
          yearMonth: selectedMonth,
        });
        added++;
      }
    }

    setSaving(true);
    try {
      await onSave(next);
      showToast?.(
        `Orçamento de ${formatYmLabel(prev)} aplicado em ${formatYmLabel(selectedMonth)}${
          added ? ` (${added} novo(s))` : ''
        }.`,
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

  const totalLimitMonth = monthBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpentMonth = monthBudgets.reduce((s, b) => s + (spentMonth[b.category] || 0), 0);
  const totalLimitYear = yearlyByCategory.reduce((s, b) => s + b.limit, 0);
  const totalSpentYear = yearlyByCategory.reduce((s, b) => s + (spentYear[b.category] || 0), 0);

  const totalLimit = viewMode === 'monthly' ? totalLimitMonth : totalLimitYear;
  const totalSpent = viewMode === 'monthly' ? totalSpentMonth : totalSpentYear;

  const available = totalLimit - totalSpent;
  const overBudget = available < 0;
  const nearLimit = !overBudget && totalLimit > 0 && totalSpent / totalLimit >= 0.85;

  const openCreateModal = () => {
    setLimit('');
    setFormMonth(selectedMonth);
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-lg border border-slate-700/80">
        <div className="flex items-start gap-3">
          <PiggyBank size={28} className="mt-0.5 shrink-0 text-indigo-300" />
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Orçamento</h3>
            <p className="text-slate-300 text-sm mt-1">
              Cadastre o limite por categoria em cada mês. O anual é a soma automática dos meses —
              previsibilidade real do ano.
            </p>
            <p className="text-slate-400 text-xs mt-3 font-medium">
              {viewMode === 'monthly'
                ? formatYmLabel(selectedMonth)
                : `Ano ${selectedYear} (soma dos meses)`}
            </p>
            <div className="flex flex-wrap gap-6 mt-3 text-sm">
              <div>
                <p className="text-slate-400">Limite total</p>
                <p className="text-lg font-bold">
                  R$ {totalLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">
                  {viewMode === 'monthly' ? 'Já gasto no mês' : 'Já gasto no ano'}
                </p>
                <p className="text-lg font-bold">
                  R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Disponível</p>
                <p
                  className={`text-lg font-bold ${
                    overBudget
                      ? 'text-red-300'
                      : nearLimit
                        ? 'text-amber-300'
                        : 'text-indigo-300'
                  }`}
                >
                  R${' '}
                  {Math.max(0, available).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                  {overBudget ? ' (estourou)' : ''}
                </p>
              </div>
            </div>
            {overBudget && (
              <p className="mt-3 text-sm bg-white/10 rounded-xl px-3 py-2 text-amber-100">
                Alerta: gastos acima do limite em{' '}
                {viewMode === 'monthly' ? formatYmLabel(selectedMonth) : selectedYear} — revise as
                categorias estouradas abaixo.
              </p>
            )}
            {!overBudget && nearLimit && (
              <p className="mt-3 text-sm bg-white/10 rounded-xl px-3 py-2 text-amber-100">
                Atenção: você já usou a maior parte do orçamento deste período.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 h-[42px] items-center border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('yearly')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                viewMode === 'yearly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Anual
            </button>
          </div>
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          {viewMode === 'monthly' && (
            <button
              type="button"
              onClick={handleCopyPreviousMonth}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 px-1"
            >
              <Copy size={14} />
              Copiar de {formatYmLabel(prevYearMonth(selectedMonth))}
            </button>
          )}
        </div>
        {viewMode === 'monthly' && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700"
          >
            <Plus size={18} />
            Novo orçamento
          </button>
        )}
      </div>

      {viewMode === 'yearly' && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 rounded-2xl px-4 py-3 text-sm border border-indigo-100 dark:border-indigo-900/60">
          A visão anual soma automaticamente os limites que você cadastrou em cada mês de{' '}
          <strong>{selectedYear}</strong>. Para alterar, use a aba <strong>Mensal</strong>.
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-visible border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Novo Orçamento
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Defina o limite de uma categoria para o mês escolhido
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <MonthPicker
                label="Mês do orçamento"
                value={formMonth}
                onChange={setFormMonth}
              />
              <FormSelect
                label="Categoria"
                value={category}
                onChange={(v) => setCategory(v as Category)}
                options={expenseCategories.map((c) => ({ value: c, label: c }))}
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Limite (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  placeholder="Ex: 800"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'monthly' ? (
        monthBudgets.length === 0 ? (
          <div className="bg-slate-100 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Nenhum orçamento em {formatYmLabel(selectedMonth)}.
            </p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              Defina limites por categoria neste mês. Depois avance os meses e monte o ano.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700"
            >
              <Plus size={16} />
              Cadastrar orçamento
            </button>
          </div>
        ) : (
          <section className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
            <div className="flex items-center justify-between px-1 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Categorias do mês
              </h4>
              <span className="text-xs text-slate-400">
                {monthBudgets.length} {monthBudgets.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {monthBudgets.map((b) => {
                const used = spentMonth[b.category] || 0;
                const pct = b.monthlyLimit > 0 ? Math.min(100, (used / b.monthlyLimit) * 100) : 0;
                const over = used > b.monthlyLimit;
                const warn = !over && pct >= 80;
                const items = expensesForMonth(transactions, b.category, selectedMonth);
                const open = expandedIds.has(b.id);

                return (
                  <BudgetCard
                    key={b.id}
                    title={b.category}
                    badge={formatYmLabel(b.yearMonth)}
                    used={used}
                    limit={b.monthlyLimit}
                    pct={pct}
                    over={over}
                    warn={warn}
                    items={items}
                    open={open}
                    onToggle={() => toggleExpanded(b.id)}
                    onDelete={() => handleDelete(b.id)}
                    periodHint="mês"
                  />
                );
              })}
            </div>
          </section>
        )
      ) : yearlyByCategory.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          <p className="font-medium text-slate-600 dark:text-slate-300">
            Nenhum orçamento mensal em {selectedYear}.
          </p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Cadastre meses na aba Mensal — o anual aparece aqui automaticamente.
          </p>
        </div>
      ) : (
        <section className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="flex items-center justify-between px-1 mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Soma anual por categoria
            </h4>
            <span className="text-xs text-slate-400">{yearlyByCategory.length} categorias</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {yearlyByCategory.map((row) => {
              const used = spentYear[row.category] || 0;
              const pct = row.limit > 0 ? Math.min(100, (used / row.limit) * 100) : 0;
              const over = used > row.limit;
              const warn = !over && pct >= 80;
              const items = expensesForYear(transactions, row.category, selectedYear);
              const open = expandedIds.has(`year-${row.category}`);

              return (
                <div key={row.category} className="space-y-2">
                  <BudgetCard
                    title={row.category}
                    badge={`Ano ${selectedYear}`}
                    used={used}
                    limit={row.limit}
                    pct={pct}
                    over={over}
                    warn={warn}
                    items={items}
                    open={open}
                    onToggle={() => toggleExpanded(`year-${row.category}`)}
                    periodHint="ano"
                  />
                  {open && (
                    <div className="mx-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 p-3 text-xs space-y-1">
                      <p className="font-bold uppercase text-slate-500 mb-1">
                        Meses que formam o anual
                      </p>
                      {[...row.months]
                        .sort((a, b) => (a.yearMonth < b.yearMonth ? -1 : 1))
                        .map((m) => (
                          <div
                            key={m.id}
                            className="flex justify-between gap-2 text-slate-700 dark:text-slate-200"
                          >
                            <span>{formatYmLabel(m.yearMonth)}</span>
                            <span className="font-semibold">
                              R${' '}
                              {m.monthlyLimit.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

interface BudgetCardProps {
  title: string;
  badge: string;
  used: number;
  limit: number;
  pct: number;
  over: boolean;
  warn: boolean;
  items: Transaction[];
  open: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  periodHint: string;
}

const BudgetCard: React.FC<BudgetCardProps> = ({
  title,
  badge,
  used,
  limit,
  pct,
  over,
  warn,
  items,
  open,
  onToggle,
  onDelete,
  periodHint,
}) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-md dark:shadow-none overflow-hidden">
    <div className="p-4 flex items-start gap-3">
      <button type="button" onClick={onToggle} className="flex-1 min-w-0 text-left space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h4>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
            {badge}
          </span>
          {open ? (
            <ChevronUp size={16} className="text-slate-400 shrink-0 ml-auto" />
          ) : (
            <ChevronDown size={16} className="text-slate-400 shrink-0 ml-auto" />
          )}
        </div>
        <p className="text-sm text-slate-500">
          R$ {used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R${' '}
          {limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
        <div className="h-2 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden">
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
                {(used - limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </>
          ) : warn ? (
            <>
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-amber-600">{pct.toFixed(0)}% usado — atenção</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span className="text-emerald-600">Dentro do limite ({pct.toFixed(0)}%)</span>
            </>
          )}
        </div>
        {!open && (
          <p className="text-[11px] text-slate-400">
            Toque para ver os {items.length || 0} gasto(s) do {periodHint}
          </p>
        )}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg shrink-0"
          title="Remover"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>

    {open && (
      <div
        className={[
          'px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-1.5 max-h-56 overflow-y-auto',
          '[scrollbar-width:thin]',
          '[scrollbar-color:rgb(148_163_184_/_0.55)_transparent]',
          '[&::-webkit-scrollbar]:w-1.5',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-slate-400/50',
          'dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/60',
        ].join(' ')}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
          Gastos do {periodHint} ({items.length})
        </p>
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 py-1">Nenhum gasto neste período.</p>
        ) : (
          items.map((t) => {
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
                  R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })
        )}
      </div>
    )}
  </div>
);

export default Budgets;
