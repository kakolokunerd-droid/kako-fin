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
import { CategoryBudget, Transaction } from '../types';
import {
  currentYearMonth,
  spentByCategory,
  spentByCategoryYear,
} from '../services/financialHealth';
import MonthPicker from './MonthPicker';

interface BudgetChartsProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onNavigate?: (tab: string) => void;
  variant?: 'dashboard' | 'reports';
  className?: string;
}

type ViewMode = 'monthly' | 'yearly';

function formatYmShort(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[m - 1]}/${String(y).slice(2)}`;
}

const BudgetCharts: React.FC<BudgetChartsProps> = ({
  budgets,
  transactions,
  onNavigate,
  variant = 'dashboard',
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
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

  const yearlyByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of budgets) {
      if (!b.yearMonth?.startsWith(selectedYear)) continue;
      map[b.category] = (map[b.category] || 0) + b.monthlyLimit;
    }
    return map;
  }, [budgets, selectedYear]);

  const chartData = useMemo(() => {
    if (viewMode === 'monthly') {
      return monthBudgets
        .map((b) => {
          const gasto = spentMonth[b.category] || 0;
          const limite = b.monthlyLimit;
          return {
            name: b.category.length > 12 ? `${b.category.slice(0, 11)}…` : b.category,
            fullName: b.category,
            limite,
            gasto,
            pct: limite > 0 ? (gasto / limite) * 100 : 0,
          };
        })
        .sort((a, b) => b.pct - a.pct);
    }

    return Object.entries(yearlyByCategory)
      .map(([category, limite]) => {
        const gasto = spentYear[category] || 0;
        return {
          name: category.length > 12 ? `${category.slice(0, 11)}…` : category,
          fullName: category,
          limite,
          gasto,
          pct: limite > 0 ? (gasto / limite) * 100 : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [viewMode, monthBudgets, yearlyByCategory, spentMonth, spentYear]);

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

  /** Tendência: cada mês usa o orçamento cadastrado naquele mês (não o mês selecionado) */
  const monthTrend = useMemo(() => {
    if (viewMode !== 'monthly') return [];
    const now = new Date();
    const points = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const ym = `${y}-${String(m).padStart(2, '0')}`;
      const monthItems = budgets.filter((b) => b.yearMonth === ym);
      const spentMap = spentByCategory(transactions, y, m);
      let gasto = 0;
      let limite = 0;
      for (const b of monthItems) {
        gasto += spentMap[b.category] || 0;
        limite += b.monthlyLimit;
      }
      points.push({
        label: formatYmShort(ym),
        gasto: Number(gasto.toFixed(2)),
        limite: Number(limite.toFixed(2)),
      });
    }
    return points;
  }, [viewMode, budgets, transactions]);

  const periodTitle =
    viewMode === 'yearly'
      ? `Ano ${selectedYear} (soma dos meses)`
      : formatYmShort(selectedMonth);

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
          Cadastre limites por mês. O anual nasce da soma desses meses.
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
            {viewMode === 'yearly'
              ? 'Limite anual = soma dos orçamentos mensais cadastrados.'
              : 'Compare limite × gasto do mês selecionado.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                viewMode === 'yearly'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              Anual
            </button>
          </div>
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="[&_button]:h-8 [&_button]:px-2.5 [&_button]:py-0 [&_button]:rounded-lg [&_button]:text-xs"
          />
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Nenhum orçamento neste período.{' '}
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
                {totals.overCount} categoria(s) acima do limite neste período.
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

          {viewMode === 'monthly' && monthTrend.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                Tendência (últimos 6 meses) — limites cadastrados em cada mês
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
