import React, { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  BarChart3,
  X,
  Store,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Edit2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Category,
  CategoryBudget,
  ShoppingLine,
  ShoppingTrip,
  ShoppingTripKind,
  StockStatus,
} from '../types';
import { currentYearMonth } from '../services/financialHealth';
import FormSelect from './FormSelect';

type Tab = 'trips' | 'home' | 'insights';

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const CHART_MARKET = '#10b981';
const CHART_OCCASIONAL = '#f59e0b';
const PIE_COLORS = [CHART_MARKET, CHART_OCCASIONAL];

interface ShoppingProps {
  trips: ShoppingTrip[];
  lines: ShoppingLine[];
  budgets: CategoryBudget[];
  onSaveTrips: (trips: ShoppingTrip[]) => Promise<void> | void;
  onSaveLines: (lines: ShoppingLine[]) => Promise<void> | void;
  onCreateTransaction?: (tx: {
    description: string;
    amount: number;
    date: string;
    category: string;
    type: 'expense';
  }) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const expenseCategories = Object.values(Category).filter((c) => c !== Category.SALARY);

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function normalizeProduct(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function tripTotal(tripId: string, lines: ShoppingLine[]) {
  return lines
    .filter((l) => l.tripId === tripId)
    .reduce((s, l) => s + l.quantity * l.unitPrice, 0);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatYmLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function prevYearMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Último preço unitário do mesmo produto antes da data (ou do trip atual) */
function findPriorUnitPrice(
  productName: string,
  trips: ShoppingTrip[],
  lines: ShoppingLine[],
  beforeDate: string,
  excludeTripId?: string
): { unitPrice: number; date: string; tripName: string } | null {
  const key = normalizeProduct(productName);
  if (!key) return null;
  const candidates: { unitPrice: number; date: string; tripName: string }[] = [];
  for (const line of lines) {
    if (excludeTripId && line.tripId === excludeTripId) continue;
    if (normalizeProduct(line.productName) !== key) continue;
    const trip = trips.find((t) => t.id === line.tripId);
    if (!trip || trip.kind === 'occasional') continue;
    if (trip.date > beforeDate) continue;
    candidates.push({
      unitPrice: line.unitPrice,
      date: trip.date,
      tripName: trip.name,
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const beforeYm = beforeDate.slice(0, 7);
  const prevYm = prevYearMonth(beforeYm);
  const fromPrevMonth = candidates.find((c) => c.date.startsWith(prevYm));
  if (fromPrevMonth) return fromPrevMonth;
  const older = candidates.find((c) => c.date.slice(0, 7) < beforeYm);
  return older || null;
}

function nextStockStatus(current?: StockStatus): StockStatus {
  if (current === 'have' || !current) return 'low';
  if (current === 'low') return 'out';
  return 'have';
}

const Shopping: React.FC<ShoppingProps> = ({
  trips,
  lines,
  budgets,
  onSaveTrips,
  onSaveLines,
  onCreateTransaction,
  showToast,
}) => {
  const [tab, setTab] = useState<Tab>('trips');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [cartTripId, setCartTripId] = useState<string | null>(null);

  const [tripName, setTripName] = useState('');
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tripCategory, setTripCategory] = useState<string>(Category.FOOD);
  const [tripKind, setTripKind] = useState<ShoppingTripKind>('market');
  const [tripNotes, setTripNotes] = useState('');

  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editLineQty, setEditLineQty] = useState('1');
  const [editLinePrice, setEditLinePrice] = useState('');

  const ymNow = currentYearMonth();
  const [yNow, mNow] = ymNow.split('-').map(Number);
  const [listYear, setListYear] = useState(yNow);
  const [listMonth, setListMonth] = useState(mNow); // 1-12

  const listYm = `${listYear}-${String(listMonth).padStart(2, '0')}`;

  const monthTrips = useMemo(
    () => trips.filter((t) => t.date.startsWith(ymNow)),
    [trips, ymNow]
  );

  const monthSpend = useMemo(
    () => monthTrips.reduce((s, t) => s + tripTotal(t.id, lines), 0),
    [monthTrips, lines]
  );

  const monthByKind = useMemo(() => {
    let market = 0;
    let occasional = 0;
    for (const t of monthTrips) {
      const total = tripTotal(t.id, lines);
      if (t.kind === 'occasional') occasional += total;
      else market += total;
    }
    return { market, occasional };
  }, [monthTrips, lines]);

  const last12MonthsByKind = useMemo(() => {
    const rows: { ym: string; label: string; market: number; occasional: number; total: number }[] =
      [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(yNow, mNow - 1 - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      rows.push({
        ym,
        label: MONTH_SHORT[d.getMonth()],
        market: 0,
        occasional: 0,
        total: 0,
      });
    }
    const map = Object.fromEntries(rows.map((r) => [r.ym, r]));
    for (const t of trips) {
      const ym = t.date.slice(0, 7);
      if (!map[ym]) continue;
      const total = tripTotal(t.id, lines);
      if (t.kind === 'occasional') map[ym].occasional += total;
      else map[ym].market += total;
      map[ym].total += total;
    }
    return rows;
  }, [trips, lines, yNow, mNow]);

  const last12MonthsSpend = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of last12MonthsByKind) map[r.ym] = r.total;
    return map;
  }, [last12MonthsByKind]);

  const yearMonthsBreakdown = useMemo(() => {
    return MONTH_LABELS.map((label, idx) => {
      const ym = `${listYear}-${String(idx + 1).padStart(2, '0')}`;
      let market = 0;
      let occasional = 0;
      let marketCount = 0;
      let occasionalCount = 0;
      for (const t of trips) {
        if (!t.date.startsWith(ym)) continue;
        const total = tripTotal(t.id, lines);
        if (t.kind === 'occasional') {
          occasional += total;
          occasionalCount += 1;
        } else {
          market += total;
          marketCount += 1;
        }
      }
      return {
        month: idx + 1,
        label,
        short: MONTH_SHORT[idx],
        ym,
        market,
        occasional,
        total: market + occasional,
        marketCount,
        occasionalCount,
      };
    });
  }, [trips, lines, listYear]);

  const pieShare = useMemo(() => {
    const market = yearMonthsBreakdown.reduce((s, m) => s + m.market, 0);
    const occasional = yearMonthsBreakdown.reduce((s, m) => s + m.occasional, 0);
    return [
      { name: 'Mercado', value: market },
      { name: 'Avulsos', value: occasional },
    ].filter((d) => d.value > 0);
  }, [yearMonthsBreakdown]);

  const topOccasional = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trips) {
      if (t.kind !== 'occasional') continue;
      if (!t.date.startsWith(String(listYear))) continue;
      map.set(t.name, (map.get(t.name) || 0) + tripTotal(t.id, lines));
    }
    return Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [trips, lines, listYear]);

  const avgMonthly = useMemo(() => {
    const values = Object.values(last12MonthsSpend);
    const withSpend = values.filter((v) => v > 0);
    if (withSpend.length === 0) return 0;
    return withSpend.reduce((a, b) => a + b, 0) / withSpend.length;
  }, [last12MonthsSpend]);

  const productStats = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string;
        times: number;
        totalQty: number;
        totalSpent: number;
        lastDate: string;
        dates: string[];
      }
    >();

    for (const line of lines) {
      const trip = trips.find((t) => t.id === line.tripId);
      if (!trip) continue;
      const key = normalizeProduct(line.productName);
      if (!key) continue;
      const prev = map.get(key) || {
        label: line.productName.trim(),
        times: 0,
        totalQty: 0,
        totalSpent: 0,
        lastDate: trip.date,
        dates: [] as string[],
      };
      prev.times += 1;
      prev.totalQty += line.quantity;
      prev.totalSpent += line.quantity * line.unitPrice;
      prev.dates.push(trip.date);
      if (trip.date > prev.lastDate) {
        prev.lastDate = trip.date;
        prev.label = line.productName.trim();
      }
      map.set(key, prev);
    }

    return Array.from(map.entries())
      .map(([key, v]) => {
        const sorted = [...v.dates].sort();
        let repurchaseDays: number | null = null;
        if (sorted.length >= 2) {
          const a = new Date(sorted[sorted.length - 2]);
          const b = new Date(sorted[sorted.length - 1]);
          repurchaseDays = Math.round((b.getTime() - a.getTime()) / 86400000);
        }
        return {
          key,
          ...v,
          avgPrice: v.totalQty > 0 ? v.totalSpent / v.totalQty : 0,
          repurchaseDays,
        };
      })
      .sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
  }, [lines, trips]);

  /** Estoque em casa: último item de mercado por produto */
  const homeInventory = useMemo(() => {
    const byKey = new Map<
      string,
      {
        key: string;
        label: string;
        lineId: string;
        tripId: string;
        quantity: number;
        unitPrice: number;
        lastDate: string;
        tripName: string;
        stockStatus: StockStatus;
      }
    >();

    const marketLines = lines
      .map((line) => {
        const trip = trips.find((t) => t.id === line.tripId);
        if (!trip || trip.kind === 'occasional') return null;
        return { line, trip };
      })
      .filter(Boolean) as { line: ShoppingLine; trip: ShoppingTrip }[];

    marketLines.sort((a, b) =>
      a.trip.date < b.trip.date ? 1 : a.trip.date > b.trip.date ? -1 : 0
    );

    for (const { line, trip } of marketLines) {
      const key = normalizeProduct(line.productName);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, {
        key,
        label: line.productName.trim(),
        lineId: line.id,
        tripId: trip.id,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lastDate: trip.date,
        tripName: trip.name,
        stockStatus: line.stockStatus || 'have',
      });
    }

    return Array.from(byKey.values()).sort((a, b) => {
      const order = { out: 0, low: 1, have: 2 };
      const oa = order[a.stockStatus];
      const ob = order[b.stockStatus];
      if (oa !== ob) return oa - ob;
      return a.label.localeCompare(b.label, 'pt-BR');
    });
  }, [lines, trips]);

  const filteredHome = useMemo(() => {
    const q = normalizeProduct(productFilter);
    if (!q) return homeInventory;
    return homeInventory.filter((p) => p.key.includes(q) || normalizeProduct(p.label).includes(q));
  }, [homeInventory, productFilter]);

  const outOfStock = useMemo(
    () => homeInventory.filter((p) => p.stockStatus === 'out'),
    [homeInventory]
  );
  const runningLow = useMemo(
    () => homeInventory.filter((p) => p.stockStatus === 'low'),
    [homeInventory]
  );

  const cartPriceHint = useMemo(() => {
    if (!cartTripId || !productName.trim()) return null;
    const price = parseFloat(unitPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price < 0) return null;
    const trip = trips.find((t) => t.id === cartTripId);
    if (!trip || trip.kind === 'occasional') return null;
    const prior = findPriorUnitPrice(productName, trips, lines, trip.date, cartTripId);
    if (!prior || prior.unitPrice <= 0) return null;
    const diff = price - prior.unitPrice;
    const pct = (diff / prior.unitPrice) * 100;
    return { prior, diff, pct, price };
  }, [cartTripId, productName, unitPrice, trips, lines]);

  const budgetFood = budgets.find(
    (b) => b.yearMonth === ymNow && b.category === Category.FOOD
  );
  const budgetLeisure = budgets.find(
    (b) => b.yearMonth === ymNow && b.category === Category.ENTERTAINMENT
  );

  const spendFoodMonth = useMemo(
    () =>
      monthTrips
        .filter((t) => t.category === Category.FOOD)
        .reduce((s, t) => s + tripTotal(t.id, lines), 0),
    [monthTrips, lines]
  );
  const spendLeisureMonth = useMemo(
    () =>
      monthTrips
        .filter((t) => t.category === Category.ENTERTAINMENT)
        .reduce((s, t) => s + tripTotal(t.id, lines), 0),
    [monthTrips, lines]
  );

  const sortedTrips = useMemo(
    () =>
      [...trips].sort((a, b) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (b.status === 'open' && a.status !== 'open') return 1;
        return a.date < b.date ? 1 : -1;
      }),
    [trips]
  );

  const monthTripsList = useMemo(
    () => sortedTrips.filter((t) => t.date.startsWith(listYm)),
    [sortedTrips, listYm]
  );

  const marketTripsInMonth = useMemo(
    () => monthTripsList.filter((t) => t.kind !== 'occasional'),
    [monthTripsList]
  );

  const occasionalTripsInMonth = useMemo(
    () => monthTripsList.filter((t) => t.kind === 'occasional'),
    [monthTripsList]
  );

  const monthMarketTotal = useMemo(
    () => marketTripsInMonth.reduce((s, t) => s + tripTotal(t.id, lines), 0),
    [marketTripsInMonth, lines]
  );

  const monthOccasionalTotal = useMemo(
    () => occasionalTripsInMonth.reduce((s, t) => s + tripTotal(t.id, lines), 0),
    [occasionalTripsInMonth, lines]
  );

  /** Orçamento de Lazer do mês selecionado na listagem */
  const leisureBudgetForList = useMemo(
    () =>
      budgets.find(
        (b) => b.yearMonth === listYm && b.category === Category.ENTERTAINMENT
      ),
    [budgets, listYm]
  );

  const leisureUsagePct = useMemo(() => {
    const limit = leisureBudgetForList?.monthlyLimit ?? 0;
    if (limit <= 0) return null;
    return (monthOccasionalTotal / limit) * 100;
  }, [leisureBudgetForList, monthOccasionalTotal]);

  /** green ≤50 · amber ≤80 · red >80 */
  const leisureTone: 'ok' | 'warn' | 'danger' | 'none' =
    leisureUsagePct == null
      ? 'none'
      : leisureUsagePct > 80
        ? 'danger'
        : leisureUsagePct > 50
          ? 'warn'
          : 'ok';

  const occasionalToneStyles = {
    ok: {
      section:
        'bg-emerald-50/40 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-800/50',
      title: 'text-emerald-700 dark:text-emerald-300',
      muted: 'text-emerald-800/80 dark:text-emerald-200/75',
      count: 'text-emerald-700/80 dark:text-emerald-300/80',
      empty: 'text-emerald-700/60 dark:text-emerald-300/55',
      icon: 'text-emerald-500',
      card: 'bg-white dark:bg-slate-800/90 border border-emerald-300/80 dark:border-emerald-700/60',
      cardTitle: 'text-slate-800 dark:text-slate-100',
      cardMeta: 'text-slate-500 dark:text-slate-400',
      cardBorder: 'border-emerald-100 dark:border-emerald-900/40',
      row: 'bg-emerald-50 dark:bg-emerald-950/40',
      btn: 'bg-emerald-600 text-white hover:bg-emerald-700',
      link: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      action: 'text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
      trash: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
    },
    warn: {
      section:
        'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/45',
      title: 'text-amber-700 dark:text-amber-300',
      muted: 'text-amber-800/80 dark:text-amber-200/75',
      count: 'text-amber-700/80 dark:text-amber-300/80',
      empty: 'text-amber-700/60 dark:text-amber-300/55',
      icon: 'text-amber-500',
      card: 'bg-amber-50/90 dark:bg-amber-950/35 border border-amber-300/90 dark:border-amber-700/55',
      cardTitle: 'text-slate-800 dark:text-slate-100',
      cardMeta: 'text-slate-600 dark:text-slate-400',
      cardBorder: 'border-amber-200/70 dark:border-amber-900/45',
      row: 'bg-amber-100/70 dark:bg-amber-950/45',
      btn: 'bg-amber-500 text-white hover:bg-amber-600',
      link: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/55 dark:text-amber-300',
      action: 'text-amber-800/80 dark:text-amber-200/80 hover:bg-amber-100/60 dark:hover:bg-amber-900/30',
      trash: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
    },
    danger: {
      section:
        'bg-red-50/45 dark:bg-red-950/25 border border-red-200/80 dark:border-red-800/50',
      title: 'text-red-700 dark:text-red-300',
      muted: 'text-red-800/80 dark:text-red-200/75',
      count: 'text-red-700/80 dark:text-red-300/80',
      empty: 'text-red-700/60 dark:text-red-300/55',
      icon: 'text-red-500',
      card: 'bg-red-50/90 dark:bg-red-950/35 border border-red-300/90 dark:border-red-700/55',
      cardTitle: 'text-slate-800 dark:text-slate-100',
      cardMeta: 'text-slate-600 dark:text-slate-400',
      cardBorder: 'border-red-200/70 dark:border-red-900/45',
      row: 'bg-red-100/70 dark:bg-red-950/45',
      btn: 'bg-red-600 text-white hover:bg-red-700',
      link: 'text-red-600 dark:text-red-300',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      action: 'text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/40',
      trash: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
    },
    none: {
      section: 'bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800',
      title: 'text-slate-500 dark:text-slate-400',
      muted: 'text-slate-500',
      count: 'text-slate-400',
      empty: 'text-slate-400',
      icon: 'text-slate-400',
      card: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600',
      cardTitle: 'text-slate-800 dark:text-slate-100',
      cardMeta: 'text-slate-500',
      cardBorder: 'border-slate-100 dark:border-slate-700',
      row: 'bg-slate-50 dark:bg-slate-900/60',
      btn: 'bg-slate-600 hover:bg-slate-700 text-white',
      link: 'text-indigo-600',
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
      action: 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5',
      trash: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
    },
  } as const;


  const occTone = occasionalToneStyles[leisureTone];

  const openCreateTrip = (kind: ShoppingTripKind = 'market') => {
    setEditingTripId(null);
    setTripName(kind === 'market' ? 'Mercado' : '');
    setTripDate(new Date().toISOString().slice(0, 10));
    setTripCategory(kind === 'market' ? Category.FOOD : Category.ENTERTAINMENT);
    setTripKind(kind);
    setTripNotes('');
    setShowTripModal(true);
  };

  const openEditTrip = (trip: ShoppingTrip) => {
    setEditingTripId(trip.id);
    setTripName(trip.name);
    setTripDate(trip.date);
    setTripCategory(trip.category);
    setTripKind(trip.kind);
    setTripNotes(trip.notes || '');
    setShowTripModal(true);
  };

  const persistTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) {
      showToast?.('Informe o nome da compra (ex.: Mercado Extra).', 'warning');
      return;
    }

    if (editingTripId) {
      const next = trips.map((t) =>
        t.id === editingTripId
          ? {
              ...t,
              name: tripName.trim(),
              date: tripDate,
              category: tripCategory,
              kind: tripKind,
              notes: tripNotes.trim() || undefined,
            }
          : t
      );
      await onSaveTrips(next);
      const [y, m] = tripDate.split('-').map(Number);
      if (y) setListYear(y);
      if (m) setListMonth(m);
      showToast?.('Compra atualizada.', 'success');
      setShowTripModal(false);
      setCartTripId(editingTripId);
      setExpandedId(editingTripId);
      return;
    }

    const id = uid();
    const trip: ShoppingTrip = {
      id,
      name: tripName.trim(),
      date: tripDate,
      category: tripCategory,
      kind: tripKind,
      status: 'open',
      notes: tripNotes.trim() || undefined,
    };
    await onSaveTrips([trip, ...trips]);
    const [y, m] = tripDate.split('-').map(Number);
    if (y) setListYear(y);
    if (m) setListMonth(m);
    setShowTripModal(false);
    setCartTripId(id);
    setExpandedId(id);
    showToast?.('Carrinho aberto — adicione os produtos.', 'success');
  };

  const addProductToCart = async (tripId: string) => {
    const name = productName.trim();
    const qty = parseFloat(quantity.replace(',', '.'));
    const price = parseFloat(unitPrice.replace(',', '.'));
    if (!name) {
      showToast?.('Informe o nome do produto.', 'warning');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast?.('Quantidade inválida.', 'warning');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast?.('Preço inválido.', 'warning');
      return;
    }

    const line: ShoppingLine = {
      id: uid(),
      tripId,
      productName: name,
      quantity: qty,
      unitPrice: price,
      stockStatus: 'have',
    };
    await onSaveLines([line, ...lines]);
    setProductName('');
    setQuantity('1');
    setUnitPrice('');
    const prior = findPriorUnitPrice(
      name,
      trips,
      lines,
      trips.find((t) => t.id === tripId)?.date || '',
      tripId
    );
    if (prior && prior.unitPrice > 0) {
      const diff = price - prior.unitPrice;
      if (diff < -0.009) {
        showToast?.(
          `${name}: R$ ${price.toFixed(2)} · economizou R$ ${Math.abs(diff).toFixed(2)} vs última compra.`,
          'success'
        );
      } else if (diff > 0.009) {
        showToast?.(
          `${name}: R$ ${price.toFixed(2)} · +R$ ${diff.toFixed(2)} mais caro que a última compra.`,
          'warning'
        );
      } else {
        showToast?.(`${name} adicionado ao carrinho.`, 'success');
      }
    } else {
      showToast?.(`${name} adicionado ao carrinho.`, 'success');
    }
  };

  const setLineStockStatus = async (lineId: string, stockStatus: StockStatus) => {
    await onSaveLines(lines.map((l) => (l.id === lineId ? { ...l, stockStatus } : l)));
  };

  const cycleStockStatus = async (lineId: string, current?: StockStatus) => {
    const next = nextStockStatus(current);
    await setLineStockStatus(lineId, next);
    if (next === 'out') showToast?.('Marcado como acabou — aparece para repor.', 'info');
    if (next === 'low') showToast?.('Marcado como acabando.', 'warning');
    if (next === 'have') showToast?.('Marcado como ainda tem em casa.', 'success');
  };

  const removeLine = async (id: string) => {
    await onSaveLines(lines.filter((l) => l.id !== id));
    if (editingLineId === id) setEditingLineId(null);
  };

  const openEditLine = (line: ShoppingLine) => {
    setEditingLineId(line.id);
    setEditLineName(line.productName);
    setEditLineQty(String(line.quantity));
    setEditLinePrice(String(line.unitPrice));
  };

  const saveEditLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLineId) return;
    const name = editLineName.trim();
    const qty = parseFloat(editLineQty.replace(',', '.'));
    const price = parseFloat(editLinePrice.replace(',', '.'));
    if (!name) {
      showToast?.('Informe o nome do produto.', 'warning');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast?.('Quantidade inválida.', 'warning');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast?.('Preço inválido.', 'warning');
      return;
    }
    await onSaveLines(
      lines.map((l) =>
        l.id === editingLineId
          ? { ...l, productName: name, quantity: qty, unitPrice: price }
          : l
      )
    );
    setEditingLineId(null);
    showToast?.('Item atualizado.', 'success');
  };

  const removeTrip = async (id: string) => {
    await onSaveTrips(trips.filter((t) => t.id !== id));
    await onSaveLines(lines.filter((l) => l.tripId !== id));
    if (cartTripId === id) setCartTripId(null);
    if (expandedId === id) setExpandedId(null);
    showToast?.('Compra removida.', 'success');
  };

  const finishTrip = async (trip: ShoppingTrip, syncTx: boolean) => {
    const total = tripTotal(trip.id, lines);
    if (total <= 0) {
      showToast?.('Adicione produtos com valor antes de finalizar.', 'warning');
      return;
    }

    const next = trips.map((t) =>
      t.id === trip.id
        ? {
            ...t,
            status: 'done' as const,
            syncedToTransactions: syncTx ? true : t.syncedToTransactions,
          }
        : t
    );
    await onSaveTrips(next);

    if (syncTx && onCreateTransaction) {
      onCreateTransaction({
        description: trip.name,
        amount: total,
        date: trip.date,
        category: trip.category,
        type: 'expense',
      });
      showToast?.(
        `Compra finalizada e lançada em Transações (R$ ${total.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })}).`,
        'success'
      );
    } else {
      showToast?.('Compra finalizada.', 'success');
    }
    setCartTripId(null);
  };

  const cartTrip = cartTripId ? trips.find((t) => t.id === cartTripId) : null;
  const cartLines = cartTripId ? lines.filter((l) => l.tripId === cartTripId) : [];

  const maxStacked = Math.max(
    ...last12MonthsByKind.map((r) => r.market + r.occasional),
    1
  );
  const yearChartMax = Math.max(...yearMonthsBreakdown.map((m) => m.total), 1);

  const renderTripCard = (trip: ShoppingTrip, variant: 'market' | 'occasional') => {
    const tripLines = lines.filter((l) => l.tripId === trip.id);
    const total = tripTotal(trip.id, lines);
    const open = expandedId === trip.id;
    const isOccasional = variant === 'occasional';

    return (
      <div
        key={trip.id}
        className={`rounded-2xl border overflow-hidden ${
          isOccasional
            ? occTone.card
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
        }`}
      >
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <button
            type="button"
            className="text-left min-w-0 flex-1"
            onClick={() => setExpandedId(open ? null : trip.id)}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {isOccasional ? (
                <Sparkles size={16} className={`${occTone.icon} shrink-0`} />
              ) : (
                <Store size={16} className="text-emerald-500 shrink-0" />
              )}
              <h4
                className={`font-bold ${
                  isOccasional ? occTone.cardTitle : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {trip.name}
              </h4>
              {trip.status === 'open' && (
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Aberto
                </span>
              )}
              {isOccasional && leisureUsagePct != null && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${occTone.badge}`}
                >
                  Lazer {leisureUsagePct.toFixed(0)}%
                </span>
              )}
            </div>
            <p
              className={`text-sm mt-0.5 ${
                isOccasional ? occTone.cardMeta : 'text-slate-500'
              }`}
            >
              {formatDate(trip.date)} · {trip.category}
              {!isOccasional && ` · ${tripLines.length} produto(s)`} · R${' '}
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            {trip.status === 'open' && (
              <button
                type="button"
                onClick={() => setCartTripId(trip.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  isOccasional ? occTone.btn : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Carrinho
              </button>
            )}
            <button
              type="button"
              onClick={() => openEditTrip(trip)}
              className={`p-2 rounded-lg text-xs font-semibold ${
                isOccasional ? occTone.action : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setExpandedId(open ? null : trip.id)}
              className={`p-2 rounded-lg ${
                isOccasional ? occTone.action : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              type="button"
              onClick={() => removeTrip(trip.id)}
              className={`p-2 rounded-lg ${
                isOccasional ? occTone.trash : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {open && (
          <div
            className={`border-t px-4 py-3 space-y-1.5 max-h-64 overflow-y-auto [scrollbar-width:thin] ${
              isOccasional ? occTone.cardBorder : 'border-slate-100 dark:border-slate-700'
            }`}
          >
            {tripLines.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">
                {isOccasional ? 'Nenhum item neste gasto.' : 'Nenhum produto nesta compra.'}
              </p>
            ) : (
              tripLines.map((l) => (
                <div
                  key={l.id}
                  className={`flex justify-between gap-2 text-sm rounded-lg px-2 py-1.5 ${
                    isOccasional
                      ? occTone.row
                      : l.stockStatus === 'out'
                        ? 'bg-slate-50 dark:bg-slate-900/60 opacity-60'
                        : l.stockStatus === 'low'
                          ? 'bg-amber-50 dark:bg-amber-950/30'
                          : 'bg-slate-50 dark:bg-slate-900/60'
                  }`}
                >
                  <span
                    className={`font-medium ${
                      isOccasional
                        ? 'text-slate-700 dark:text-slate-200'
                        : l.stockStatus === 'out'
                          ? 'line-through text-slate-400'
                          : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {l.productName}{' '}
                    <span className="text-slate-400 font-normal">×{l.quantity}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isOccasional && (
                      <button
                        type="button"
                        onClick={() => cycleStockStatus(l.id, l.stockStatus)}
                        className="text-[10px] font-bold text-slate-500 hover:text-emerald-600 px-1"
                        title="Status em casa"
                      >
                        {l.stockStatus === 'out'
                          ? 'Acabou'
                          : l.stockStatus === 'low'
                            ? 'Acabando'
                            : 'Em casa'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditLine(l)}
                      className={`p-1.5 rounded-lg ${
                        isOccasional
                          ? 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                          : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      }`}
                      title="Editar item"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className={`p-1.5 rounded-lg ${
                        isOccasional
                          ? occTone.trash
                          : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                      }`}
                      title="Remover item"
                    >
                      <Trash2 size={14} />
                    </button>
                    <span className="font-semibold min-w-[4.5rem] text-right text-slate-800 dark:text-slate-100">
                      R${' '}
                      {(l.quantity * l.unitPrice).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
            {trip.status === 'done' && !trip.syncedToTransactions && onCreateTransaction && (
              <button
                type="button"
                onClick={() => {
                  if (total <= 0) return;
                  onCreateTransaction({
                    description: trip.name,
                    amount: total,
                    date: trip.date,
                    category: trip.category,
                    type: 'expense',
                  });
                  onSaveTrips(
                    trips.map((t) =>
                      t.id === trip.id ? { ...t, syncedToTransactions: true } : t
                    )
                  );
                  showToast?.('Lançado em Transações.', 'success');
                }}
                className={`mt-2 text-sm font-semibold hover:underline ${
                  isOccasional ? occTone.link : 'text-emerald-600'
                }`}
              >
                Lançar total em Transações
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-lg border border-slate-700/80">
        <div className="flex items-start gap-3">
          <ShoppingCart size={28} className="mt-0.5 shrink-0 text-emerald-300" />
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Compras</h3>
            <p className="text-slate-300 text-sm mt-1">
              Monte o carrinho no mercado, anote gastos avulsos e veja o que você compra de
              verdade — para não repetir o que ainda tem em casa e comparar com o orçamento.
            </p>
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-slate-400">Este mês</p>
                <p className="text-lg font-bold">
                  R$ {monthSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Média mensal (12m)</p>
                <p className="text-lg font-bold text-emerald-300">
                  R$ {avgMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Produtos no histórico</p>
                <p className="text-lg font-bold">{productStats.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-300">
              <span>
                Mercado:{' '}
                <strong className="text-white">
                  R$ {monthByKind.market.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </span>
              <span>
                Avulsos:{' '}
                <strong className="text-white">
                  R${' '}
                  {monthByKind.occasional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl gap-1 border border-slate-200 dark:border-slate-700">
          {(
            [
              { id: 'trips' as const, label: 'Compras', icon: Store },
              { id: 'home' as const, label: 'Em casa', icon: Package },
              { id: 'insights' as const, label: 'Painel', icon: BarChart3 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors ${
                tab === id
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCreateTrip('occasional')}
            className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/40 px-4 py-2.5 rounded-xl font-semibold hover:bg-amber-500/25"
          >
            <Sparkles size={16} />
            Gasto avulso
          </button>
          <button
            type="button"
            onClick={() => openCreateTrip('market')}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700"
          >
            <Plus size={18} />
            Nova compra
          </button>
        </div>
      </div>

      {(outOfStock.length > 0 || runningLow.length > 0) && (
        <div className="space-y-2">
          {outOfStock.length > 0 && (
            <div className="rounded-2xl border border-red-300/50 dark:border-red-800/60 bg-red-50/80 dark:bg-red-950/30 px-4 py-3 flex flex-wrap items-start gap-2 justify-between">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-300">
                    {outOfStock.length} produto(s) acabaram — precisa repor
                  </p>
                  <p className="text-xs text-red-600/80 dark:text-red-300/70 mt-0.5">
                    {outOfStock
                      .slice(0, 5)
                      .map((p) => p.label)
                      .join(', ')}
                    {outOfStock.length > 5 ? '…' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('home')}
                className="text-xs font-bold text-red-700 dark:text-red-300 underline shrink-0"
              >
                Ver em casa
              </button>
            </div>
          )}
          {runningLow.length > 0 && (
            <div className="rounded-2xl border border-amber-300/50 dark:border-amber-800/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex flex-wrap items-start gap-2 justify-between">
              <div className="flex items-start gap-2 min-w-0">
                <CircleDot size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {runningLow.length} produto(s) acabando
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                    {runningLow
                      .slice(0, 5)
                      .map((p) => p.label)
                      .join(', ')}
                    {runningLow.length > 5 ? '…' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('home')}
                className="text-xs font-bold text-amber-800 dark:text-amber-300 underline shrink-0"
              >
                Ver em casa
              </button>
            </div>
          )}
        </div>
      )}

      {editingLineId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Editar item
              </h3>
              <button
                type="button"
                onClick={() => setEditingLineId(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={saveEditLine} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Produto
                </label>
                <input
                  value={editLineName}
                  onChange={(e) => setEditLineName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Quantidade
                  </label>
                  <input
                    value={editLineQty}
                    onChange={(e) => setEditLineQty(e.target.value)}
                    inputMode="decimal"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Preço un. (R$)
                  </label>
                  <input
                    value={editLinePrice}
                    onChange={(e) => setEditLinePrice(e.target.value)}
                    inputMode="decimal"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Total:{' '}
                <strong className="text-slate-800 dark:text-slate-100">
                  R${' '}
                  {(
                    (parseFloat(editLineQty.replace(',', '.')) || 0) *
                    (parseFloat(editLinePrice.replace(',', '.')) || 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingLineId(null)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTripModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingTripId ? 'Editar compra' : tripKind === 'market' ? 'Nova compra' : 'Gasto avulso'}
              </h3>
              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={persistTrip} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setTripKind('market');
                    if (!tripName || tripName === '') setTripName('Mercado');
                    setTripCategory(Category.FOOD);
                  }}
                  className={`py-2 rounded-xl text-sm font-bold ${
                    tripKind === 'market'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Mercado / lista
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTripKind('occasional');
                    setTripCategory(Category.ENTERTAINMENT);
                  }}
                  className={`py-2 rounded-xl text-sm font-bold ${
                    tripKind === 'occasional'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Avulso
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Onde / o que
                </label>
                <input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder={
                    tripKind === 'market' ? 'Ex: Mercado Extra, Atacadão' : 'Ex: Churrasquinho, Delivery'
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
                  required
                />
              </div>
              <FormSelect
                label="Categoria (orçamento)"
                accent="indigo"
                value={tripCategory}
                onChange={setTripCategory}
                options={expenseCategories.map((c) => ({ value: c, label: c }))}
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Observação (opcional)
                </label>
                <input
                  value={tripNotes}
                  onChange={(e) => setTripNotes(e.target.value)}
                  placeholder="Ex: compra da semana"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl outline-none text-sm"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTripModal(false)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                >
                  {editingTripId ? 'Salvar' : 'Abrir carrinho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {cartTrip && cartTrip.status === 'open' && (
        <section className="rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Carrinho aberto
              </p>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {cartTrip.name}
              </h4>
              <p className="text-sm text-slate-500">
                {formatDate(cartTrip.date)} · {cartTrip.category} ·{' '}
                {cartTrip.kind === 'market' ? 'Mercado' : 'Avulso'}
              </p>
            </div>
            <p className="text-right">
              <span className="block text-xs text-slate-500">Total</span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                R${' '}
                {tripTotal(cartTrip.id, lines).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_5rem_7rem_auto] gap-2">
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              list="shopping-product-suggestions"
              placeholder="Produto (ex: Arroz 5kg)"
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <datalist id="shopping-product-suggestions">
              {productStats.slice(0, 40).map((p) => (
                <option key={p.key} value={p.label} />
              ))}
            </datalist>
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qtd"
              inputMode="decimal"
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="R$ un."
              inputMode="decimal"
              className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => addProductToCart(cartTrip.id)}
              className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          {cartPriceHint && (
            <p
              className={`text-xs font-medium px-1 ${
                cartPriceHint.diff < -0.009
                  ? 'text-cyan-600 dark:text-cyan-300'
                  : cartPriceHint.diff > 0.009
                    ? 'text-amber-600 dark:text-amber-300'
                    : 'text-slate-500'
              }`}
            >
              Última compra ({formatDate(cartPriceHint.prior.date)}): R${' '}
              {cartPriceHint.prior.unitPrice.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
              {cartPriceHint.diff < -0.009 && (
                <>
                  {' '}
                  · economizou R${' '}
                  {Math.abs(cartPriceHint.diff).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  ({cartPriceHint.pct.toFixed(0)}%)
                </>
              )}
              {cartPriceHint.diff > 0.009 && (
                <>
                  {' '}
                  · +R${' '}
                  {cartPriceHint.diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} mais
                  caro (+{cartPriceHint.pct.toFixed(0)}%)
                </>
              )}
              {Math.abs(cartPriceHint.diff) <= 0.009 && <> · mesmo preço</>}
            </p>
          )}

          {productName.trim() &&
            outOfStock.some((p) => p.key === normalizeProduct(productName)) && (
              <p className="text-xs text-red-600 dark:text-red-300 px-1 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                Este produto estava marcado como acabou em casa — boa hora de repor.
              </p>
            )}

          {productName.trim() &&
            homeInventory.some(
              (p) =>
                p.key === normalizeProduct(productName) && p.stockStatus === 'have'
            ) && (
              <p className="text-xs text-amber-700 dark:text-amber-300 px-1 flex items-center gap-1.5">
                <Package size={13} />
                Você ainda marcou este item como em casa — confira antes de comprar de novo.
              </p>
            )}

          {cartLines.length > 0 ? (
            <ul className="space-y-1.5 max-h-56 overflow-y-auto [scrollbar-width:thin]">
              {cartLines.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-2 text-sm border border-slate-100 dark:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {l.productName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {l.quantity} × R${' '}
                      {l.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-bold text-slate-700 dark:text-slate-200 min-w-[4.5rem] text-right">
                      R${' '}
                      {(l.quantity * l.unitPrice).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditLine(l)}
                      className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                      title="Editar item"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                      title="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 text-center py-4">
              Vá adicionando os produtos enquanto percorre o mercado.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCartTripId(null)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
            >
              Minimizar
            </button>
            <button
              type="button"
              onClick={() => finishTrip(cartTrip, false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            >
              Finalizar
            </button>
            <button
              type="button"
              onClick={() => finishTrip(cartTrip, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={16} />
              Finalizar e lançar em Transações
            </button>
          </div>
        </section>
      )}

      {tab === 'trips' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Compras por mês
              </h4>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setListYear((y) => y - 1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                  aria-label="Ano anterior"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[3.5rem] text-center">
                  {listYear}
                </span>
                <button
                  type="button"
                  onClick={() => setListYear((y) => y + 1)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                  aria-label="Próximo ano"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {MONTH_SHORT.map((label, idx) => {
                const month = idx + 1;
                const selected = listMonth === month;
                const info = yearMonthsBreakdown[idx];
                const hasData = info.total > 0 || info.marketCount + info.occasionalCount > 0;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setListMonth(month)}
                    className={`rounded-xl px-2 py-2 text-center transition-colors ${
                      selected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : hasData
                          ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                          : 'bg-transparent text-slate-400 border border-dashed border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{label}</span>
                    {hasData && (
                      <span
                        className={`block text-[9px] mt-0.5 truncate ${
                          selected ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        R$ {info.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3 text-xs px-1 text-slate-500">
              <span>
                {MONTH_LABELS[listMonth - 1]} {listYear}:{' '}
                <strong className="text-slate-700 dark:text-slate-200">
                  R${' '}
                  {(monthMarketTotal + monthOccasionalTotal).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Mercado R${' '}
                {monthMarketTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-amber-600 dark:text-amber-400">
                Avulsos R${' '}
                {monthOccasionalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Mercado */}
          <section className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Compras de mercado
                </h4>
              </div>
              <span className="text-xs text-slate-400">
                {marketTripsInMonth.length}{' '}
                {marketTripsInMonth.length === 1 ? 'ida' : 'idas'}
              </span>
            </div>
            {marketTripsInMonth.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Nenhuma ida ao mercado em {MONTH_LABELS[listMonth - 1].toLowerCase()}.
              </p>
            ) : (
              <div className="space-y-2">
                {marketTripsInMonth.map((t) => renderTripCard(t, 'market'))}
              </div>
            )}
          </section>

          {/* Avulsos — cor conforme orçamento de Lazer do mês */}
          <section className={`rounded-3xl border p-3 sm:p-4 space-y-3 ${occTone.section}`}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className={occTone.icon} />
                <h4 className={`text-xs font-bold uppercase tracking-wide ${occTone.title}`}>
                  Gastos avulsos
                </h4>
              </div>
              <span className={`text-xs ${occTone.count}`}>
                {occasionalTripsInMonth.length}{' '}
                {occasionalTripsInMonth.length === 1 ? 'gasto' : 'gastos'}
              </span>
            </div>
            <p className={`text-xs px-1 ${occTone.muted}`}>
              Churrasquinho, delivery, farmácia rápida… separados do mercado para comparar com o
              orçamento de lazer.
              {leisureBudgetForList ? (
                <>
                  {' '}
                  · Usado R${' '}
                  {monthOccasionalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de
                  R${' '}
                  {leisureBudgetForList.monthlyLimit.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  ({leisureUsagePct?.toFixed(0)}%)
                  {leisureTone === 'ok' && ' — dentro do conforto'}
                  {leisureTone === 'warn' && ' — atenção'}
                  {leisureTone === 'danger' && ' — acima de 80% do limite'}
                </>
              ) : (
                <> · Cadastre o limite de Lazer no Orçamento deste mês para ver as cores.</>
              )}
            </p>
            {occasionalTripsInMonth.length === 0 ? (
              <p className={`py-8 text-center text-sm ${occTone.empty}`}>
                Nenhum gasto avulso neste mês.
              </p>
            ) : (
              <div className="space-y-2">
                {occasionalTripsInMonth.map((t) => renderTripCard(t, 'occasional'))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'home' && (
        <section className="rounded-3xl bg-slate-100/90 dark:bg-slate-950/55 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                O que tem em casa
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Toque no status para ciclar: tenho → acabando → acabou (riscado). Assim você sabe o
                que repor no mercado.
              </p>
            </div>
            <input
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              placeholder="Buscar produto…"
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-sm w-full sm:w-56 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] px-1">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={12} /> Tenho (
              {homeInventory.filter((p) => p.stockStatus === 'have').length})
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <CircleDot size={12} /> Acabando ({runningLow.length})
            </span>
            <span className="inline-flex items-center gap-1 text-red-500">
              <Circle size={12} /> Acabou ({outOfStock.length})
            </span>
          </div>

          {filteredHome.length === 0 ? (
            <p className="py-12 text-center text-slate-400 text-sm">
              Nenhum produto de mercado ainda. Finalize uma compra com itens para montar a
              despensa.
            </p>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHome.map((p) => {
                const isOut = p.stockStatus === 'out';
                const isLow = p.stockStatus === 'low';
                return (
                  <div
                    key={p.key}
                    className={`flex items-center gap-3 px-3 py-3 ${
                      isOut ? 'opacity-70' : isLow ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => cycleStockStatus(p.lineId, p.stockStatus)}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                        isOut
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          : isLow
                            ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      title="Alterar status (tenho → acabando → acabou)"
                    >
                      {isOut ? (
                        <CheckCircle2 size={20} className="text-emerald-500" />
                      ) : isLow ? (
                        <CircleDot size={20} />
                      ) : (
                        <Circle size={20} />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold text-slate-800 dark:text-slate-100 ${
                          isOut ? 'line-through text-slate-400 dark:text-slate-500' : ''
                        }`}
                      >
                        {p.label}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${
                          isOut
                            ? 'text-red-500 line-through'
                            : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {isOut
                          ? 'Acabou — precisa repor'
                          : isLow
                            ? 'Acabando — fique de olho'
                            : `Em casa · comprado em ${formatDate(p.lastDate)} (${p.tripName})`}
                        {' · '}
                        R${' '}
                        {p.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        /un.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setLineStockStatus(p.lineId, 'have')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          p.stockStatus === 'have'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Tenho
                      </button>
                      <button
                        type="button"
                        onClick={() => setLineStockStatus(p.lineId, 'low')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          p.stockStatus === 'low'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Acabando
                      </button>
                      <button
                        type="button"
                        onClick={() => setLineStockStatus(p.lineId, 'out')}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          p.stockStatus === 'out'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        Acabou
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'insights' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Painel de consumo — mercado vs avulsos
            </p>
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setListYear((y) => y - 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[3.5rem] text-center">
                {listYear}
              </span>
              <button
                type="button"
                onClick={() => setListYear((y) => y + 1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">
                vs Orçamento · {formatYmLabel(ymNow)}
              </p>
              <div className="space-y-3">
                <BudgetCompare
                  label="Alimentação (compras)"
                  spent={spendFoodMonth}
                  limit={budgetFood?.monthlyLimit}
                />
                <BudgetCompare
                  label="Lazer (avulsos nesta tela)"
                  spent={spendLeisureMonth}
                  limit={budgetLeisure?.monthlyLimit}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1">
                Participação no ano {listYear}
              </p>
              {pieShare.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">Sem gastos neste ano.</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieShare}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                      >
                        {pieShare.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) =>
                          `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
              Mercado × Avulsos · últimos 12 meses
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Barras empilhadas: verde = mercado · âmbar = gastos avulsos
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last12MonthsByKind} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'market' ? 'Mercado' : 'Avulsos',
                    ]}
                  />
                  <Legend
                    formatter={(v) => (v === 'market' ? 'Mercado' : 'Avulsos')}
                  />
                  <Bar dataKey="market" stackId="a" fill={CHART_MARKET} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="occasional" stackId="a" fill={CHART_OCCASIONAL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Média mensal (meses com gasto):{' '}
              <strong>
                R$ {avgMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
              <span className="text-slate-400"> · pico relativo {maxStacked.toLocaleString('pt-BR')}</span>
            </p>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">
              Calendário {listYear} · total por mês
            </h4>
            <p className="text-xs text-slate-400 mb-3">Toque num mês para abrir a listagem</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearMonthsBreakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33415533" />
                  <XAxis dataKey="short" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [
                      `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'market' ? 'Mercado' : 'Avulsos',
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.label
                        ? `${payload[0].payload.label} ${listYear}`
                        : ''
                    }
                  />
                  <Bar
                    dataKey="market"
                    stackId="y"
                    fill={CHART_MARKET}
                    cursor="pointer"
                    onClick={(data: any) => {
                      const month = data?.payload?.month ?? data?.month;
                      if (month) {
                        setListMonth(month);
                        setTab('trips');
                      }
                    }}
                  />
                  <Bar
                    dataKey="occasional"
                    stackId="y"
                    fill={CHART_OCCASIONAL}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      const month = data?.payload?.month ?? data?.month;
                      if (month) {
                        setListMonth(month);
                        setTab('trips');
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Escala relativa até R$ {yearChartMax.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1">
                Top produtos (mercado)
              </p>
              <ul className="space-y-2 mt-2">
                {[...productStats]
                  .sort((a, b) => b.totalSpent - a.totalSpent)
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.key} className="flex justify-between text-sm gap-2">
                      <span className="truncate text-slate-700 dark:text-slate-200">{p.label}</span>
                      <span className="font-semibold shrink-0 text-emerald-700 dark:text-emerald-300">
                        R$ {p.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                {productStats.length === 0 && (
                  <li className="text-sm text-slate-400">Sem dados ainda.</li>
                )}
              </ul>
            </div>
            <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 mb-1">
                Top gastos avulsos · {listYear}
              </p>
              <ul className="space-y-2 mt-2">
                {topOccasional.map((p) => (
                  <li key={p.name} className="flex justify-between text-sm gap-2">
                    <span className="truncate text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-500 shrink-0" />
                      {p.name}
                    </span>
                    <span className="font-semibold shrink-0 text-amber-700 dark:text-amber-300">
                      R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
                {topOccasional.length === 0 && (
                  <li className="text-sm text-amber-700/50 dark:text-amber-400/50">
                    Nenhum avulso neste ano.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const BudgetCompare: React.FC<{
  label: string;
  spent: number;
  limit?: number;
}> = ({ label, spent, limit }) => {
  const hasLimit = typeof limit === 'number' && limit > 0;
  const pct = hasLimit ? Math.min(100, (spent / limit) * 100) : 0;
  const over = hasLimit && spent > limit;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          R$ {spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          {hasLimit
            ? ` / ${limit!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : ''}
        </span>
      </div>
      {hasLimit ? (
        <>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {over && (
            <p className="text-xs text-red-500 mt-1">Estourou o limite desta categoria no mês.</p>
          )}
        </>
      ) : (
        <p className="text-xs text-slate-400">Sem limite cadastrado no Orçamento.</p>
      )}
    </div>
  );
};

export default Shopping;
