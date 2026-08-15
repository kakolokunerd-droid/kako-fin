import React, { useMemo, useState } from 'react';
import {
  CalendarRange,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
} from 'lucide-react';
import { Category, InstallmentPlan, Transaction } from '../types';
import {
  currentYearMonth,
  getInstallmentSchedule,
  monthlyInstallmentBurden,
} from '../services/financialHealth';
import FormSelect from './FormSelect';
import MonthPicker from './MonthPicker';

interface InstallmentsProps {
  plans: InstallmentPlan[];
  onSave: (plans: InstallmentPlan[]) => Promise<void> | void;
  onCreateTransaction?: (tx: Omit<Transaction, 'id'>) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  monthIncome?: number;
}

const emptyForm = (ym: string) => ({
  name: '',
  totalAmount: '',
  installmentAmount: '',
  totalInstallments: '12',
  startYearMonth: ym,
  dueDay: '10',
  category: Category.LOAN as string,
});

const Installments: React.FC<InstallmentsProps> = ({
  plans,
  onSave,
  onCreateTransaction,
  showToast,
  monthIncome = 0,
}) => {
  const ymNow = currentYearMonth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallments, setTotalInstallments] = useState('12');
  const [startYearMonth, setStartYearMonth] = useState(ymNow);
  const [dueDay, setDueDay] = useState('10');
  const [category, setCategory] = useState<string>(Category.LOAN);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const burden = useMemo(() => monthlyInstallmentBurden(plans, ymNow), [plans, ymNow]);
  const commitmentPct = monthIncome > 0 ? (burden / monthIncome) * 100 : 0;

  const remainingTotal = useMemo(() => {
    return plans.reduce((sum, p) => {
      const paidCount = (p.paidNumbers || []).length;
      return sum + Math.max(0, p.totalInstallments - paidCount) * p.installmentAmount;
    }, 0);
  }, [plans]);

  const resetForm = () => {
    const f = emptyForm(ymNow);
    setEditingId(null);
    setName(f.name);
    setTotalAmount(f.totalAmount);
    setInstallmentAmount(f.installmentAmount);
    setTotalInstallments(f.totalInstallments);
    setStartYearMonth(f.startYearMonth);
    setDueDay(f.dueDay);
    setCategory(f.category);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const startEdit = (plan: InstallmentPlan) => {
    setEditingId(plan.id);
    setName(plan.name);
    setTotalAmount(String(plan.totalAmount));
    setInstallmentAmount(String(plan.installmentAmount));
    setTotalInstallments(String(plan.totalInstallments));
    setStartYearMonth(plan.startYearMonth);
    setDueDay(String(plan.dueDay));
    setCategory(plan.category);
    setExpandedId(plan.id);
    setShowModal(true);
  };

  const syncParcelFromTotal = (totalStr: string, countStr: string) => {
    const total = parseFloat(totalStr.replace(',', '.'));
    const count = parseInt(countStr, 10);
    if (Number.isFinite(total) && total > 0 && Number.isFinite(count) && count > 0) {
      setInstallmentAmount((total / count).toFixed(2));
    }
  };

  const parseForm = () => {
    const total = parseFloat(totalAmount.replace(',', '.'));
    const parcel = parseFloat(installmentAmount.replace(',', '.'));
    const count = parseInt(totalInstallments, 10);
    const day = parseInt(dueDay, 10);

    if (!name.trim()) {
      showToast?.('Informe o nome (ex.: Financiamento do carro).', 'warning');
      return null;
    }
    if (!Number.isFinite(total) || total <= 0) {
      showToast?.('Informe o valor total.', 'warning');
      return null;
    }
    if (!Number.isFinite(parcel) || parcel <= 0) {
      showToast?.('Informe o valor da parcela.', 'warning');
      return null;
    }
    if (!Number.isFinite(count) || count < 2) {
      showToast?.(
        'Parcelamentos precisam de pelo menos 2 parcelas. Conta mensal? Use Transações + clonar mês.',
        'warning'
      );
      return null;
    }
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      showToast?.('Dia de vencimento entre 1 e 31.', 'warning');
      return null;
    }
    if (!/^\d{4}-\d{2}$/.test(startYearMonth)) {
      showToast?.('Informe o mês da 1ª parcela.', 'warning');
      return null;
    }

    return { total, parcel, count, day };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseForm();
    if (!parsed) return;

    const { total, parcel, count, day } = parsed;

    setSaving(true);
    try {
      if (editingId) {
        const existing = plans.find((p) => p.id === editingId);
        const keptPaid = (existing?.paidNumbers || []).filter((n) => n >= 1 && n <= count);
        const updated: InstallmentPlan = {
          id: editingId,
          name: name.trim(),
          category,
          totalAmount: total,
          installmentAmount: parcel,
          totalInstallments: count,
          startYearMonth,
          dueDay: day,
          paidNumbers: keptPaid,
          notes: existing?.notes,
        };
        await onSave(plans.map((p) => (p.id === editingId ? updated : p)));
        showToast?.('Conta longa atualizada.', 'success');
        setExpandedId(editingId);
        resetForm();
        setShowModal(false);
      } else {
        const plan: InstallmentPlan = {
          id: Math.random().toString(36).slice(2, 11),
          name: name.trim(),
          category,
          totalAmount: total,
          installmentAmount: parcel,
          totalInstallments: count,
          startYearMonth,
          dueDay: day,
          paidNumbers: [],
        };
        await onSave([...plans, plan]);
        setExpandedId(plan.id);
        resetForm();
        setShowModal(false);
        showToast?.(`${count} parcelas agendadas até o fim do financiamento.`, 'success');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (editingId === id) resetForm();
    setSaving(true);
    try {
      await onSave(plans.filter((p) => p.id !== id));
      if (expandedId === id) setExpandedId(null);
      showToast?.('Conta longa removida.', 'info');
    } finally {
      setSaving(false);
    }
  };

  const togglePaid = async (plan: InstallmentPlan, number: number, currentlyPaid: boolean) => {
    const paid = new Set(plan.paidNumbers || []);
    if (currentlyPaid) paid.delete(number);
    else paid.add(number);

    const next = plans.map((p) =>
      p.id === plan.id ? { ...p, paidNumbers: Array.from(paid).sort((a, b) => a - b) } : p
    );
    await onSave(next);

    if (!currentlyPaid && onCreateTransaction) {
      const schedule = getInstallmentSchedule({ ...plan, paidNumbers: Array.from(paid) });
      const occ = schedule.find((s) => s.number === number);
      if (occ) {
        onCreateTransaction({
          description: `${plan.name} (${number}/${plan.totalInstallments})`,
          amount: plan.installmentAmount,
          date: occ.dueDate,
          category: plan.category,
          type: 'expense',
        });
      }
      showToast?.(`Parcela ${number}/${plan.totalInstallments} paga e lançada nas Transações.`, 'success');
    } else if (currentlyPaid) {
      showToast?.(`Parcela ${number} marcada como pendente.`, 'info');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-teal-950 text-white rounded-3xl p-6 shadow-lg border border-slate-700/80">
        <div className="flex items-start gap-3">
          <CalendarRange size={28} className="mt-0.5 shrink-0 text-teal-300" />
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Contas longas</h3>
            <p className="text-slate-300 text-sm mt-1">
              Financiamentos, empréstimos e compras parceladas — do início à última parcela.
              Contas que se repetem todo mês (aluguel, salário) ficam em Transações, com clonar mês.
            </p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-slate-400">Parcelas deste mês</p>
                <p className="text-lg font-bold">
                  R$ {burden.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Ainda a pagar (todas)</p>
                <p className="text-lg font-bold">
                  R$ {remainingTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {monthIncome > 0 && (
                <div>
                  <p className="text-slate-400">Compromisso da renda</p>
                  <p
                    className={`text-lg font-bold ${
                      commitmentPct > 40
                        ? 'text-red-300'
                        : commitmentPct > 30
                          ? 'text-amber-300'
                          : 'text-teal-300'
                    }`}
                  >
                    {commitmentPct.toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
            {commitmentPct > 30 && (
              <p className="mt-3 text-sm bg-white/10 rounded-xl px-3 py-2 text-amber-100">
                {commitmentPct > 40
                  ? 'Alerta: parcelas acima de 40% da renda — alto risco de sair do foco.'
                  : 'Atenção: parcelas acima de 30% da renda. Evite novos parcelamentos por enquanto.'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          Financiamentos e compras parceladas com começo e fim.
        </p>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-teal-700"
        >
          <Plus size={18} />
          Nova conta longa
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col overflow-visible">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-t-3xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Editar conta longa' : 'Nova conta longa'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto overflow-x-visible">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  O que é?
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Financiamento do carro, Empréstimo pessoal"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Valor total (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalAmount}
                    onChange={(e) => {
                      setTotalAmount(e.target.value);
                      syncParcelFromTotal(e.target.value, totalInstallments);
                    }}
                    placeholder="45000"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Qtd. de parcelas
                  </label>
                  <input
                    type="number"
                    min="2"
                    max="480"
                    value={totalInstallments}
                    onChange={(e) => {
                      setTotalInstallments(e.target.value);
                      syncParcelFromTotal(totalAmount, e.target.value);
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Valor da parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    placeholder="Calculado ou digite"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pode diferir do total ÷ parcelas (juros do banco).
                  </p>
                </div>
                <div>
                  <MonthPicker
                    label="Mês da 1ª parcela"
                    value={startYearMonth}
                    onChange={setStartYearMonth}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Dia do vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <FormSelect
                    label="Categoria"
                    accent="teal"
                    value={category}
                    onChange={setCategory}
                    options={Object.values(Category).map((c) => ({ value: c, label: c }))}
                  />
                </div>
              </div>
              {editingId && (
                <p className="text-xs text-slate-500">
                  Parcelas já pagas são mantidas (se ainda existirem no novo prazo).
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-teal-600 text-white font-bold hover:bg-teal-700 rounded-xl disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {editingId ? (
                    <>
                      <Edit2 size={16} />
                      Salvar
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Agendar
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="bg-slate-100 dark:bg-slate-950/50 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 py-16 text-center text-slate-400">
          <CalendarRange className="mx-auto mb-3 opacity-50" size={36} />
          <p className="font-medium text-slate-600 dark:text-slate-300">Nenhuma conta longa ainda</p>
          <p className="text-sm mt-1 max-w-md mx-auto">
            Cadastre carro, empréstimo ou compra no cartão em várias vezes para ver o peso no futuro
            e receber alertas se o compromisso ficar alto.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-700"
          >
            <Plus size={16} />
            Cadastrar agora
          </button>
        </div>
      ) : (
        <section className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Suas contas
            </h4>
            <span className="text-xs text-slate-400">
              {plans.length} {plans.length === 1 ? 'conta' : 'contas'}
            </span>
          </div>
          {plans.map((plan) => {
            const schedule = getInstallmentSchedule(plan);
            const paidCount = schedule.filter((s) => s.paid).length;
            const next = schedule.find((s) => !s.paid);
            const overdueCount = schedule.filter((s) => s.overdue).length;
            const expanded = expandedId === plan.id;
            const pct = Math.round((paidCount / plan.totalInstallments) * 100);
            const isEditing = editingId === plan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-md dark:shadow-none overflow-hidden ${
                  isEditing
                    ? 'border-teal-400 dark:border-teal-500'
                    : 'border-slate-200 dark:border-slate-600'
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <button
                    type="button"
                    className="text-left min-w-0 flex-1"
                    onClick={() => setExpandedId(expanded ? null : plan.id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100">{plan.name}</h4>
                      {isEditing && (
                        <span className="text-[10px] font-bold uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                          Editando
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {overdueCount} atrasada(s)
                        </span>
                      )}
                      {paidCount === plan.totalInstallments && (
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          Quitado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {paidCount}/{plan.totalInstallments} · Parcela R${' '}
                      {plan.installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      {next
                        ? ` · Próxima: ${next.number}ª (${next.dueDate.split('-').reverse().join('/')})`
                        : ''}
                    </p>
                    <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700/80 rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-teal-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(plan)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : plan.id)}
                      className="p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg"
                      title={expanded ? 'Recolher' : 'Ver parcelas'}
                    >
                      {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div
                    className={[
                      'border-t border-slate-100 dark:border-slate-700 max-h-72 overflow-y-auto',
                      '[scrollbar-width:thin]',
                      '[scrollbar-color:rgb(148_163_184_/_0.55)_transparent]',
                      '[&::-webkit-scrollbar]:w-1.5',
                      '[&::-webkit-scrollbar-track]:bg-transparent',
                      '[&::-webkit-scrollbar-thumb]:rounded-full',
                      '[&::-webkit-scrollbar-thumb]:bg-slate-400/50',
                      'dark:[&::-webkit-scrollbar-thumb]:bg-slate-500/60',
                    ].join(' ')}
                  >                    {schedule.map((occ) => (
                      <div
                        key={occ.number}
                        className={`px-4 py-2.5 flex items-center justify-between gap-2 text-sm ${
                          occ.paid
                            ? 'bg-slate-50 dark:bg-slate-800/50'
                            : occ.overdue
                              ? 'bg-red-50/60'
                              : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`font-semibold ${
                              occ.paid
                                ? 'text-slate-400 line-through'
                                : 'text-slate-800 dark:text-slate-100'
                            }`}
                          >
                            Parcela {occ.number}/{plan.totalInstallments}
                          </p>
                          <p className="text-xs text-slate-500">
                            {occ.dueDate.split('-').reverse().join('/')} · R${' '}
                            {occ.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            {occ.overdue ? ' · atrasada' : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => togglePaid(plan, occ.number, occ.paid)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                            occ.paid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          {occ.paid ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                          {occ.paid ? 'Paga' : 'Pagar'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default Installments;
