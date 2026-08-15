import {
  Transaction,
  CategoryBudget,
  FinancialHealth,
  CashFlowPoint,
  InstallmentPlan,
  InstallmentOccurrence,
} from '../types';

function currentYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDueDay(dueDay: number, year: number, month: number): number {
  return Math.min(dueDay, daysInMonth(year, month));
}

/** Soma N meses a um YYYY-MM */
export function addMonthsYm(ym: string, add: number): string {
  const [y0, m0] = ym.split('-').map(Number);
  const d = new Date(y0, m0 - 1 + add, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Agenda completa de parcelas de um plano */
export function getInstallmentSchedule(plan: InstallmentPlan): InstallmentOccurrence[] {
  const paid = new Set(plan.paidNumbers || []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const items: InstallmentOccurrence[] = [];

  for (let n = 1; n <= plan.totalInstallments; n++) {
    const ym = addMonthsYm(plan.startYearMonth, n - 1);
    const [y, m] = ym.split('-').map(Number);
    const due = clampDueDay(plan.dueDay, y, m);
    const dueDate = `${ym}-${String(due).padStart(2, '0')}`;
    const dueDt = new Date(y, m - 1, due);
    const isPaid = paid.has(n);
    items.push({
      planId: plan.id,
      planName: plan.name,
      number: n,
      yearMonth: ym,
      dueDate,
      amount: plan.installmentAmount,
      paid: isPaid,
      overdue: !isPaid && dueDt < today,
    });
  }
  return items;
}

export function getAllPendingInstallments(
  plans: InstallmentPlan[],
  options?: { onlyCurrentMonth?: boolean; limit?: number }
): InstallmentOccurrence[] {
  const ym = currentYearMonth();
  let list = plans.flatMap(getInstallmentSchedule).filter((i) => !i.paid);
  if (options?.onlyCurrentMonth) {
    list = list.filter((i) => i.yearMonth === ym);
  }
  list.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.number - b.number));
  if (options?.limit) list = list.slice(0, options.limit);
  return list;
}

/** Compromisso mensal de parcelas (valor das parcelas do mês) */
export function monthlyInstallmentBurden(plans: InstallmentPlan[], ym?: string): number {
  const target = ym || currentYearMonth();
  return plans
    .flatMap(getInstallmentSchedule)
    .filter((i) => i.yearMonth === target)
    .reduce((s, i) => s + i.amount, 0);
}

function monthIncome(transactions: Transaction[], y: number, m: number): number {
  let income = 0;
  for (const t of transactions) {
    if (t.type !== 'income') continue;
    const [ty, tm] = t.date.split('-').map(Number);
    if (ty === y && tm === m) income += t.amount;
  }
  return income;
}

/** Taxa de poupança do mês corrente */
export function calcSavingsRate(transactions: Transaction[], year?: number, month?: number): number {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;

  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    const [ty, tm] = t.date.split('-').map(Number);
    if (ty !== y || tm !== m) continue;
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  if (income <= 0) return 0;
  return ((income - expense) / income) * 100;
}

/** Gasto do mês por categoria (apenas despesas) */
export function spentByCategory(
  transactions: Transaction[],
  year?: number,
  month?: number
): Record<string, number> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const map: Record<string, number> = {};

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const [ty, tm] = t.date.split('-').map(Number);
    if (ty !== y || tm !== m) continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return map;
}

/** Gasto do ano por categoria (apenas despesas) */
export function spentByCategoryYear(
  transactions: Transaction[],
  year?: number
): Record<string, number> {
  const y = year ?? new Date().getFullYear();
  const map: Record<string, number> = {};

  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    const [ty] = t.date.split('-').map(Number);
    if (ty !== y) continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  return map;
}

/** Score simples de saúde financeira (0-100) focado em ajudar */
export function calcFinancialHealth(
  transactions: Transaction[],
  budgets: CategoryBudget[],
  plans: InstallmentPlan[],
  goalsProgressAvg: number
): FinancialHealth {
  const tips: string[] = [];
  let score = 50;

  const savingsRate = calcSavingsRate(transactions);
  if (savingsRate >= 20) {
    score += 20;
  } else if (savingsRate >= 10) {
    score += 12;
    tips.push('Boa poupança. Tente chegar em 20% da renda para acelerar suas metas.');
  } else if (savingsRate >= 0) {
    score += 4;
    tips.push('Sua poupança está baixa. Revise gastos variáveis (lazer, delivery, assinaturas).');
  } else {
    score -= 15;
    tips.push('Você gastou mais do que ganhou este mês. Priorize cortes e contas essenciais.');
  }

  const spent = spentByCategory(transactions);
  const spentYear = spentByCategoryYear(transactions);
  const ym = currentYearMonth();
  const year = String(new Date().getFullYear());

  const monthlyBudgets = budgets.filter((b) => b.yearMonth === ym);
  // Anual = soma dos limites mensais do ano, por categoria
  const yearlyLimitByCategory: Record<string, number> = {};
  for (const b of budgets) {
    if (!b.yearMonth?.startsWith(year)) continue;
    yearlyLimitByCategory[b.category] =
      (yearlyLimitByCategory[b.category] || 0) + b.monthlyLimit;
  }
  const yearlyEntries = Object.entries(yearlyLimitByCategory);

  if (budgets.length === 0) {
    tips.push('Defina orçamentos por mês e categoria — o anual nasce da soma dos meses.');
  } else {
    let over = 0;
    let ok = 0;
    for (const b of monthlyBudgets) {
      const used = spent[b.category] || 0;
      if (used > b.monthlyLimit) over++;
      else ok++;
    }
    for (const [category, limit] of yearlyEntries) {
      const used = spentYear[category] || 0;
      if (used > limit) over++;
      else ok++;
    }
    const tracked = monthlyBudgets.length + yearlyEntries.length;
    if (tracked === 0) {
      tips.push('Cadastre o orçamento deste mês para acompanhar o foco no curto prazo.');
    } else if (over === 0) {
      score += 15;
      if (ok > 0) tips.push('Parabéns: seus orçamentos estão sob controle.');
    } else if (over <= tracked / 2) {
      score += 5;
      tips.push(`${over} orçamento(s) passaram do limite. Ajuste gastos ou o teto.`);
    } else {
      score -= 10;
      tips.push('Vários orçamentos estourou. Revise limites realistas e foque nas maiores categorias.');
    }
  }

  const now = new Date();
  const burden = monthlyInstallmentBurden(plans, ym);
  const income = monthIncome(transactions, now.getFullYear(), now.getMonth() + 1);
  const pendingThisMonth = getAllPendingInstallments(plans, { onlyCurrentMonth: true });
  const overdue = plans.flatMap(getInstallmentSchedule).filter((i) => i.overdue);

  if (plans.length === 0) {
    tips.push('Tem financiamento ou compra parcelada? Cadastre em Contas longas para ver o impacto futuro.');
  } else {
    if (overdue.length > 0) {
      score -= 12;
      tips.push(`${overdue.length} parcela(s) atrasada(s). Regularize para não sair do foco.`);
    } else if (pendingThisMonth.length > 0) {
      tips.push(`${pendingThisMonth.length} parcela(s) ainda pendente(s) este mês.`);
    }

    if (income > 0 && burden > 0) {
      const ratio = (burden / income) * 100;
      if (ratio > 40) {
        score -= 15;
        tips.push(
          `Parcelas comprometem ${ratio.toFixed(0)}% da renda — risco alto de sair do foco. Evite novas dívidas.`
        );
      } else if (ratio > 30) {
        score -= 5;
        tips.push(
          `Parcelas já levam ${ratio.toFixed(0)}% da renda. Fique atento antes de parcelar mais.`
        );
      } else {
        score += 8;
      }
    }
  }

  if (goalsProgressAvg >= 70) score += 10;
  else if (goalsProgressAvg >= 30) score += 5;
  else if (goalsProgressAvg > 0) tips.push('Avance um pouco nas metas toda semana — consistência vence valor alto esporádico.');
  else tips.push('Crie uma meta pequena (ex.: reserva de emergência) para dar direção ao dinheiro.');

  score = Math.max(0, Math.min(100, score));

  let label: FinancialHealth['label'] = 'Atenção';
  if (score >= 80) label = 'Excelente';
  else if (score >= 60) label = 'Bom';
  else if (score >= 40) label = 'Atenção';
  else label = 'Crítico';

  if (tips.length === 0) {
    tips.push('Continue assim: acompanhe o caixa semanalmente e ajuste cedo.');
  }

  return { score, label, savingsRate, tips: tips.slice(0, 4) };
}

/**
 * Previsão de saldo: transações + parcelas futuras ainda não pagas
 */
export function projectCashFlow(
  transactions: Transaction[],
  plans: InstallmentPlan[],
  daysAhead = 90
): CashFlowPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let balance = 0;
  for (const t of transactions) {
    const [y, m, d] = t.date.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (dt <= today) {
      balance += t.type === 'income' ? t.amount : -t.amount;
    }
  }

  const points: CashFlowPoint[] = [];
  const txByDate = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = txByDate.get(t.date) || [];
    list.push(t);
    txByDate.set(t.date, list);
  }

  const pendingByDate = new Map<string, number>();
  for (const occ of getAllPendingInstallments(plans)) {
    pendingByDate.set(occ.dueDate, (pendingByDate.get(occ.dueDate) || 0) + occ.amount);
  }

  for (let i = 0; i <= daysAhead; i++) {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() + i);
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const d = cursor.getDate();
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    let inflow = 0;
    let outflow = 0;

    if (i > 0) {
      for (const t of txByDate.get(dateStr) || []) {
        if (t.type === 'income') inflow += t.amount;
        else outflow += t.amount;
      }
    }

    outflow += pendingByDate.get(dateStr) || 0;

    if (i > 0 || inflow > 0 || outflow > 0) {
      balance += inflow - outflow;
    }

    const keep =
      i === 0 ||
      i <= 14 ||
      cursor.getDay() === 1 ||
      i === daysAhead;

    if (keep) {
      points.push({
        date: dateStr,
        label: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`,
        projectedBalance: Number(balance.toFixed(2)),
        inflow,
        outflow,
      });
    }
  }

  return points;
}

export function exportTransactionsCsv(transactions: Transaction[]): string {
  const header = 'Data,Tipo,Categoria,Descrição,Valor\n';
  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => {
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      const tipo = t.type === 'income' ? 'Receita' : 'Despesa';
      return `${t.date},${tipo},${t.category},${desc},${t.amount.toFixed(2)}`;
    })
    .join('\n');
  return header + rows;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { currentYearMonth, clampDueDay };
