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

function getPeriodStart(period: SavingsPeriod, now: Date): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  switch (period) {
    case 'current_month':
      return start;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return new Date(now.getFullYear(), q, 1);
    }
    case '3m':
      start.setMonth(start.getMonth() - 2);
      return start;
    case '6m':
      start.setMonth(start.getMonth() - 5);
      return start;
    case '12m':
      start.setMonth(start.getMonth() - 11);
      return start;
    case '2y':
      start.setFullYear(start.getFullYear() - 2);
      return start;
    case '5y':
      start.setFullYear(start.getFullYear() - 5);
      return start;
    default:
      return start;
  }
}

function buildBuckets(period: SavingsPeriod, now: Date): { key: string; label: string; year: number; month?: number; quarter?: number }[] {
  const buckets: { key: string; label: string; year: number; month?: number; quarter?: number }[] = [];

  if (period === 'quarter') {
    // Últimos 4 trimestres (incluindo o atual)
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      buckets.push({
        key: `${d.getFullYear()}-Q${q}`,
        label: `T${q}/${d.getFullYear()}`,
        year: d.getFullYear(),
        quarter: q,
      });
    }
    // Deduplicate while preserving order
    const seen = new Set<string>();
    return buckets.filter((b) => {
      if (seen.has(b.key)) return false;
      seen.add(b.key);
      return true;
    });
  }

  if (period === 'current_month') {
    return [{
      key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      label: `${MONTH_NAMES[now.getMonth()]}/${now.getFullYear()}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }];
  }

  const start = getPeriodStart(period, now);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor <= end) {
    const month = cursor.getMonth() + 1;
    const year = cursor.getFullYear();
    buckets.push({
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${MONTH_NAMES[month - 1]}/${year}`,
      year,
      month,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
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
    db.getPaidTransactionsMap(userEmail).then((map) => {
      if (mounted) setInternalPaidMap(map);
    }).catch(() => {});
    return () => { mounted = false; };
  }, [userEmail, paidMapProp]);

  const paidMap = paidMapProp || internalPaidMap;

  const chartData = useMemo(() => {
    const now = new Date();
    const buckets = buildBuckets(period, now);
    const savingsByKey: Record<string, number> = {};
    buckets.forEach((b) => { savingsByKey[b.key] = 0; });

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

      if (period === 'quarter') {
        const q = Math.floor((month - 1) / 3) + 1;
        const key = `${year}-Q${q}`;
        if (key in savingsByKey) savingsByKey[key] += saved;
      } else {
        const key = `${year}-${String(month).padStart(2, '0')}`;
        if (key in savingsByKey) savingsByKey[key] += saved;
      }
    }

    return buckets.map((b) => ({
      name: b.label,
      economia: Number(savingsByKey[b.key].toFixed(2)),
    }));
  }, [transactions, paidMap, period]);

  const totalSaved = chartData.reduce((sum, d) => sum + d.economia, 0);

  return (
    <div className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
          <PiggyBank className="text-emerald-600" size={18} />
          {title}
        </h4>
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

      <div className="h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              interval={period === '5y' || period === '2y' ? 1 : 0}
              angle={period === '5y' || period === '2y' ? -35 : 0}
              textAnchor={period === '5y' || period === '2y' ? 'end' : 'middle'}
              height={period === '5y' || period === '2y' ? 60 : 30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              tickFormatter={(value: number) =>
                value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
              }
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              formatter={(value: number) => [
                `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                'Economia',
              ]}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Bar dataKey="economia" fill="#10b981" radius={[4, 4, 0, 0]} name="Economia" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SavingsChart;
