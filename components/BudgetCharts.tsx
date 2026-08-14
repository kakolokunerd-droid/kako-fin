import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { PiggyBank, AlertTriangle } from 'lucide-react';
import { BudgetPeriod, CategoryBudget, Transaction } from '../types';
import { spentByCategory, spentByCategoryYear } from '../services/financialHealth';

interface BudgetChartsProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onNavigate?: (tab: string) => void;
  /** Compacto no Dashboard; completo em Relatórios */
  variant?: 'dashboard' | 'reports';
  className?: string;
}

function normalizePeriod(b: CategoryBudget): BudgetPeriod {
  return b.period === 'yearly' ? 'yearly' : 'monthly';
}

const BudgetCharts: React.FC<BudgetChartsProps> = ({
  budgets,
  transactions,
  onNavigate,
  variant = 'dashboard',
  className = '',
}) => {
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');

  const spentMonth = useMemo(() => spentByCategory(transactions), [transactions]);
  const spentYear = useMemo(() => spentByCategoryYear(transactions), [transactions]);
  const spent = period === 'yearly' ? spentYear : spentMonth;

  const periodBudgets = useMemo(
    () => budgets.filter((b) => normalizePeriod(b) === period),
    [budgets, period]
  );

  const chartData = useMemo(() => {
    return periodBudgets
      .map((b) => {
        const gasto = spent[b.category] || 0;
        const limite = b.monthlyLimit;
        return {
          name: b.category.length > 12 ? `${b.category.slice(0, 11)}…` : b.category,
          fullName: b.category,
          limite,
          gasto,
          restante: Math.max(0, limite - gasto),
          estourou: Math.max(0, gasto - limite),
          pct: limite > 0 ? (gasto / limite) * 100 : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [periodBudgets, spent]);

  const totals = useMemo(() => {
    const limite = chartData.reduce((s, d) => s + d.limite, 0);
    const gasto = chartData.reduce((s, d) => s + d.gasto, 0);
    return {
      limite,
      gasto,
      disponivel: Math.max(0, limite - gasto),
      pct: limite > 0 ? (gasto / limite) * 100 : 0,
      overCount: chartData.filter((d) => d.gasto > d.limite).length,
    };
  }, [chartData]);

  const monthTrend = useMemo(() => {
    if (period !== 'monthly' || periodBudgets.length === 0) return [];
    const now = new Date();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const points = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const spentMap = spentByCategory(transactions, y, m);
      let gasto = 0;
      let limite = 0;
      for (const b of periodBudgets) {
        gasto += spentMap[b.category] || 0;
        limite += b.monthlyLimit;
      }
      points.push({
        label: `${monthNames[d.getMonth()]}/${String(y).slice(2)}`,
        gasto: Number(gasto.toFixed(2)),
        limite: Number(limite.toFixed(2)),
      });
    }
    return points;
  }, [period, periodBudgets, transactions]);

  const periodTitle = period === 'yearly' ? `Ano ${new Date().getFullYear()}` : 'Mês atual';

  if (budgets.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      >
        <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
          <PiggyBank className="text-indigo-600" size={18} />
          Orçamento — visão gráfica
        </h4>
        <p className="text-sm text-slate-500 mb-3">
          Ainda não há limites cadastrados. Defina mensal e anual para acompanhar o foco.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('budgets')}
          className="text-sm font-semibold text-indigo-600 hover:underline"
        >
          Ir para Orçamento →
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <PiggyBank className="text-indigo-600" size={18} />
            Orçamento — {periodTitle}
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Compare limite × gasto por categoria ({period === 'yearly' ? 'ano' : 'mês'}).
          </p>
        </div>
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 self-start">
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setPeriod('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              period === 'yearly'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Anual
          </button>
        </div>
      </div>

      {periodBudgets.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Nenhum orçamento {period === 'yearly' ? 'anual' : 'mensal'}.{' '}
          <button
            type="button"
            className="text-indigo-600 font-semibold underline"
            onClick={() => onNavigate?.('budgets')}
          >
            Cadastrar
          </button>
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-500 font-medium">Limite</p>
              <p className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                R$ {totals.limite.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-500 font-medium">Gasto</p>
              <p className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                R$ {totals.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-500 font-medium">Disponível</p>
              <p className="text-sm md:text-base font-bold text-emerald-600">
                R$ {totals.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
              <p className="text-[11px] text-slate-500 font-medium">Uso</p>
              <p
                className={`text-sm md:text-base font-bold ${
                  totals.pct > 100
                    ? 'text-red-600'
                    : totals.pct >= 80
                      ? 'text-amber-600'
                      : 'text-indigo-600'
                }`}
              >
                {totals.pct.toFixed(0)}%
              </p>
            </div>
          </div>

          {totals.overCount > 0 && (
            <div className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 rounded-xl px-3 py-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                {totals.overCount} categoria(s) acima do limite neste período. Foque nelas primeiro.
              </span>
            </div>
          )}

          <div className="h-56 md:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip
                  formatter={(value: number, key: string) => [
                    `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    key === 'limite' ? 'Limite' : 'Gasto',
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  formatter={(value) => (value === 'limite' ? 'Limite' : 'Gasto')}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="limite" fill="#c7d2fe" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="gasto" radius={[0, 4, 4, 0]} barSize={10}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.fullName}
                      fill={
                        entry.gasto > entry.limite
                          ? '#ef4444'
                          : entry.pct >= 80
                            ? '#f59e0b'
                            : '#6366f1'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {period === 'monthly' && monthTrend.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                Tendência (últimos 6 meses) — categorias orçadas
              </p>
              <div className="h-44 md:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number, key: string) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        key === 'limite' ? 'Limite' : 'Gasto',
                      ]}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend
                      formatter={(value) => (value === 'limite' ? 'Limite' : 'Gasto')}
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="limite" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gasto" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {variant === 'reports' && (
            <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-3 py-2 font-bold">Categoria</th>
                    <th className="px-3 py-2 font-bold text-right">Limite</th>
                    <th className="px-3 py-2 font-bold text-right">Gasto</th>
                    <th className="px-3 py-2 font-bold text-right">Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => (
                    <tr
                      key={row.fullName}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                        {row.fullName}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        R$ {row.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">
                        R$ {row.gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-semibold ${
                          row.pct > 100
                            ? 'text-red-600'
                            : row.pct >= 80
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {row.pct.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BudgetCharts;
