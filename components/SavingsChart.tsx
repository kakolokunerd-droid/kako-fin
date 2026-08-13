import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PiggyBank } from 'lucide-react';
import { Transaction, SavingsPeriod, PaidTransactionsMap } from '../types';
import { db } from '../services/db';

interface SavingsChartProps {
  transactions: Transaction[];
  userEmail?: string;
  paidMap?: PaidTransactionsMap;
  title?: string;
  className?: string;
}

type BucketMode = 'month' | 'quarter' | 'year';

const PERIOD_OPTIONS: { id: SavingsPeriod; label: string }[] = [
  { id: 'current_month', label: 'Mês atual' },
  { id: 'quarter', label: 'Trimestre' },
  { id: '3m', label: '3 meses' },
  { id: '6m', label: '6 meses' },
  { id: '12m', label: '12 meses' },
  { id: '2y', label: '2 anos' },
  { id: '5y', label: '5 anos' },
];

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

function getBucketMode(period: SavingsPeriod): BucketMode {
  // Períodos longos agregam para o eixo ficar legível
  if (period === '5y') return 'year';
  if (period === '2y' || period === 'quarter') return 'quarter';
  return 'month';
}

function shortYear(year: number): string {
  return String(year).slice(-2);
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function quarterKey(year: number, quarter: number): string {
  return `${year}-Q${quarter}`;
}

function yearKey(year: number): string {
  return `${year}`;
}

function buildBuckets(
  period: SavingsPeriod,
  now: Date
): { key: string; label: string; fullLabel: string }[] {
  const mode = getBucketMode(period);
  const buckets: { key: string; label: string; fullLabel: string }[] = [];
  const seen = new Set<string>();

  const push = (key: string, label: string, fullLabel: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    buckets.push({ key, label, fullLabel });
  };

  if (period === 'current_month') {
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    push(
      monthKey(y, m),
      `${MONTH_NAMES[m - 1]}/${shortYear(y)}`,
      `${MONTH_NAMES[m - 1]}/${y}`
    );
    return buckets;
  }

  if (mode === 'year') {
    // Últimos 5 anos + ano atual
    for (let i = 5; i >= 0; i--) {
      const y = now.getFullYear() - i;
      push(yearKey(y), String(y), `Ano ${y}`);
    }
    return buckets;
  }

  if (mode === 'quarter') {
    // 2 anos ≈ 8 trimestres; "Trimestre" ≈ 4
    const count = period === '2y' ? 8 : 4;
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const y = d.getFullYear();
      push(quarterKey(y, q), `T${q}/${shortYear(y)}`, `Trimestre ${q}/${y}`);
    }
    return buckets;
  }

  // Mensal: 3 / 6 / 12 meses
  const monthsBack =
    period === '3m' ? 2 : period === '6m' ? 5 : 11; // 12m padrão

  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    push(
      monthKey(y, m),
      `${MONTH_NAMES[m - 1]}/${shortYear(y)}`,
      `${MONTH_NAMES[m - 1]}/${y}`
    );
  }

  return buckets;
}

function savingsBucketKey(
  mode: BucketMode,
  year: number,
  month: number
): string {
  if (mode === 'year') return yearKey(year);
  if (mode === 'quarter') {
    const q = Math.floor((month - 1) / 3) + 1;
    return quarterKey(year, q);
  }
  return monthKey(year, month);
}

const SavingsChart: React.FC<SavingsChartProps> = ({
  transactions,
  userEmail,
  paidMap: paidMapProp,
  title = 'Economia por antecipação / desconto',
  className = '',
}) => {
  const [period, setPeriod] = useState<SavingsPeriod>('12m');
  const [internalPaidMap, setInternalPaidMap] = useState<PaidTransactionsMap>({});

  useEffect(() => {
    if (paidMapProp) return;
    if (!userEmail) return;
    let mounted = true;
    db.getPaidTransactionsMap(userEmail)
      .then((map) => {
        if (mounted) setInternalPaidMap(map);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [userEmail, paidMapProp]);

  const paidMap = paidMapProp || internalPaidMap;
  const mode = getBucketMode(period);

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets = buildBuckets(period, now);
    const savingsByKey: Record<string, number> = {};
    buckets.forEach((b) => {
      savingsByKey[b.key] = 0;
    });

    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      const info = paidMap[t.id];
      if (!info) continue;

      const paidAmount = db.resolvePaidAmount(info, t.amount);
      const saved = Math.max(0, t.amount - paidAmount);
      if (saved <= 0) continue;

      const [yStr, mStr] = t.date.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const key = savingsBucketKey(mode, year, month);
      if (key in savingsByKey) {
        savingsByKey[key] += saved;
      }
    }

    return buckets.map((b) => ({
      name: b.label,
      fullLabel: b.fullLabel,
      economia: Number(savingsByKey[b.key].toFixed(2)),
    }));
  }, [transactions, paidMap, period, mode]);

  const totalSaved = chartData.reduce((sum, d) => sum + d.economia, 0);

  const oblique = chartData.length > 6;
  const xAxisHeight = oblique ? 56 : 32;
  const granularityHint =
    mode === 'year'
      ? 'Agrupado por ano'
      : mode === 'quarter'
        ? 'Agrupado por trimestre'
        : 'Agrupado por mês';

  return (
    <div
      className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
            <PiggyBank className="text-emerald-600" size={18} />
            {title}
          </h4>
          <p className="text-xs text-slate-500 mt-1">{granularityHint}</p>
        </div>
        <p className="text-sm font-semibold text-emerald-700">
          Total: R$ {totalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setPeriod(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              period === opt.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="h-64 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: oblique ? 8 : 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33415533" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={oblique ? -35 : 0}
              textAnchor={oblique ? 'end' : 'middle'}
              height={xAxisHeight}
              tick={{ fontSize: chartData.length > 10 ? 10 : 12, fill: '#94a3b8' }}
              minTickGap={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={40}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickFormatter={(value: number) =>
                value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
              }
            />
            <Tooltip
              cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
              formatter={(value: number) => [
                `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                'Economia',
              ]}
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.fullLabel || String(_label)
              }
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            />
            <Bar
              dataKey="economia"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Economia"
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SavingsChart;
