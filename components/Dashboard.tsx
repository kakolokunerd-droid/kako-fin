import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BrainCircuit,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Transaction, Goal } from "../types";
import { getFinancialAdvice } from "../services/geminiService";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
  user?: { lastContributionDate?: string };
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, goals, user }) => {
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(true);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState<boolean>(false);
  const [shouldShowInsights, setShouldShowInsights] = useState<boolean>(false);

  // Função para formatar data para exibição sem problemas de timezone
  const formatDateForDisplay = (dateString: string): string => {
    // Extrair dia, mês e ano diretamente da string YYYY-MM-DD
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  // Verificar se deve mostrar os Insights (apenas para quem contribuiu)
  useEffect(() => {
    const checkInsights = () => {
      if (!user?.lastContributionDate) {
        setShouldShowInsights(false);
        return;
      }

      const lastContribution = new Date(user.lastContributionDate);
      const now = new Date();
      const daysSinceContribution = Math.floor(
        (now.getTime() - lastContribution.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Mostra apenas se contribuiu há menos de 30 dias
      setShouldShowInsights(daysSinceContribution < 30);
    };

    checkInsights(); // Verificar imediatamente

    const interval = setInterval(checkInsights, 120000); // Verificar a cada 2 minutos

    return () => clearInterval(interval);
  }, [user?.lastContributionDate]);

  // Calcular totais apenas do mês atual
  const getCurrentMonthTransactions = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    return transactions.filter((t) => {
      // Extrair mês e ano diretamente da string da data (formato YYYY-MM-DD) para evitar problemas de timezone
      const [yearStr, monthStr] = t.date.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr); // 1-12

      return month === currentMonth && year === currentYear;
    });
  };

  const currentMonthTransactions = getCurrentMonthTransactions();

  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Dados para gráfico de evolução por semanas do mês corrente
  const getMonthlyEvolution = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Obter primeiro e último dia do mês atual
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);

    // Dividir o mês em semanas (segunda a domingo)
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const monthName = firstDay.toLocaleDateString("pt-BR", { month: "short" });

    // Encontrar a primeira segunda-feira do mês (ou usar o dia 1 se for segunda)
    let weekStart = new Date(firstDay);
    const firstDayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

    // Se o primeiro dia não for segunda, encontrar a segunda-feira anterior
    if (firstDayOfWeek !== 1) {
      const daysToMonday = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
      weekStart = new Date(firstDay);
      weekStart.setDate(firstDay.getDate() - daysToMonday);
    }

    // Se a segunda-feira anterior for antes do mês, começar no dia 1
    if (weekStart < firstDay) {
      weekStart = new Date(firstDay);
    }

    // Criar semanas até cobrir todo o mês
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Domingo

      // Ajustar se ultrapassar o último dia do mês
      if (weekEnd > lastDay) {
        weekEnd.setTime(lastDay.getTime());
      }

      // Ajustar início se for antes do primeiro dia
      const actualStart =
        weekStart < firstDay ? new Date(firstDay) : new Date(weekStart);

      // Criar label
      const startDay = String(actualStart.getDate()).padStart(2, "0");
      const endDay = String(weekEnd.getDate()).padStart(2, "0");
      const label = `${startDay}-${endDay} ${monthName}`;

      weeks.push({
        start: actualStart,
        end: new Date(weekEnd),
        label,
      });

      // Próxima semana começa na segunda-feira seguinte
      weekStart.setDate(weekStart.getDate() + 7);
    }

    return weeks.map(({ start, end, label }) => {
      // Normalizar datas de início e fim da semana (sem horas)
      const startDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const endDate = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );

      // Filtrar transações do mês corrente que estão nesta semana
      const weekTransactions = transactions.filter((t) => {
        const [tYearStr, tMonthStr, tDayStr] = t.date.split("-");
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12
        const tDay = parseInt(tDayStr);

        // Verificar se é do mês corrente
        if (tMonth !== currentMonth || tYear !== currentYear) {
          return false;
        }

        // Verificar se está dentro da semana (comparar apenas datas, sem horas)
        const tDate = new Date(tYear, tMonth - 1, tDay);
        const tDateOnly = new Date(
          tDate.getFullYear(),
          tDate.getMonth(),
          tDate.getDate()
        );

        return tDateOnly >= startDate && tDateOnly <= endDate;
      });

      const receita = weekTransactions
        .filter((t) => t.type === "income")
        .reduce((a, b) => a + b.amount, 0);
      const despesa = weekTransactions
        .filter((t) => t.type === "expense")
        .reduce((a, b) => a + b.amount, 0);

      return {
        date: label,
        receita,
        despesa,
        saldo: receita - despesa,
        start: startDate, // Preservar start para uso posterior
        end: endDate, // Preservar end para uso posterior
      };
    });
  };

  const monthlyEvolution = getMonthlyEvolution();

  // Dados para gráfico de saldo do mês corrente (com saldo positivo/negativo)
  const getBalanceEvolution = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Obter primeiro e último dia do mês atual
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const today = new Date();
    const lastDayToShow = today > lastDay ? lastDay : today; // Não mostrar além de hoje

    // Calcular saldo acumulado dia a dia
    const dailyBalance: { date: Date; saldoAcumulado: number }[] = [];
    let saldoAcumulado = 0;

    // Iterar por cada dia do mês até hoje
    for (let day = 1; day <= lastDayToShow.getDate(); day++) {
      const currentDate = new Date(currentYear, currentMonth - 1, day);

      // Filtrar transações até este dia (inclusive)
      const transactionsUntilDate = transactions.filter((t) => {
        const [tYearStr, tMonthStr, tDayStr] = t.date.split("-");
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr);
        const tDay = parseInt(tDayStr);

        if (tMonth !== currentMonth || tYear !== currentYear) return false;
        return tDay <= day;
      });

      const receita = transactionsUntilDate
        .filter((t) => t.type === "income")
        .reduce((a, b) => a + b.amount, 0);
      const despesa = transactionsUntilDate
        .filter((t) => t.type === "expense")
        .reduce((a, b) => a + b.amount, 0);
      saldoAcumulado = receita - despesa;

      dailyBalance.push({
        date: new Date(currentDate),
        saldoAcumulado,
      });
    }

    // Calcular totais do mês para validação
    const totalReceitaMes = monthlyEvolution.reduce(
      (sum, week) => sum + week.receita,
      0
    );
    const totalDespesaMes = monthlyEvolution.reduce(
      (sum, week) => sum + week.despesa,
      0
    );
    const totalSaldoMes = totalReceitaMes - totalDespesaMes;

    // Mapear semanas com dados diários para o saldo acumulado
    const weeksData = monthlyEvolution.map((week, index) => {
      // Encontrar o último dia da semana
      const weekEndDate = (week as any).end || new Date();
      const weekEndDay = weekEndDate.getDate();

      // Encontrar o saldo acumulado no último dia da semana
      const balanceAtWeekEnd = dailyBalance.find(
        (db) => db.date.getDate() === weekEndDay
      );
      const saldoAcumuladoSemana = balanceAtWeekEnd
        ? balanceAtWeekEnd.saldoAcumulado
        : 0;

      return {
        ...week,
        saldoAcumulado: saldoAcumuladoSemana,
        saldoSemana: week.saldo,
        // Adicionar total do mês para referência
        totalReceitaMes,
        totalDespesaMes,
        totalSaldoMes,
      };
    });

    // Criar array combinado: semanas para barras + dias para linha
    // Para cada semana, adicionar também os pontos diários do saldo acumulado
    const combinedData: any[] = [];

    monthlyEvolution.forEach((week, weekIndex) => {
      // Adicionar ponto da semana (para as barras)
      combinedData.push({
        ...week,
        saldoAcumulado: null, // Não mostrar na semana, apenas nos dias
        isWeek: true,
      });

      // Adicionar pontos diários desta semana (para a linha) - todos os dias
      const weekWithDates = week as any;
      const weekStartDay = weekWithDates.start
        ? weekWithDates.start.getDate()
        : 1;
      const weekEndDay = weekWithDates.end
        ? weekWithDates.end.getDate()
        : lastDay.getDate();

      for (
        let day = weekStartDay;
        day <= weekEndDay && day <= lastDayToShow.getDate();
        day++
      ) {
        const dailyData = dailyBalance.find((db) => db.date.getDate() === day);
        if (dailyData) {
          combinedData.push({
            date: week.date, // Usar o mesmo label da semana para alinhar no eixo X
            saldoAcumulado: dailyData.saldoAcumulado,
            receita: null,
            despesa: null,
            saldo: null,
            isWeek: false,
            dayNumber: day, // Para ordenação
          });
        }
      }
    });

    return {
      weeksData,
      combinedData,
      dailyBalance,
      totalSaldoMes,
      totalReceitaMes,
      totalDespesaMes,
    };
  };

  const balanceEvolutionData = getBalanceEvolution();
  const balanceEvolution = balanceEvolutionData.weeksData;
  const combinedChartData = balanceEvolutionData.combinedData;

  // Dados para gráfico de evolução anual (receitas e gastos por mês)
  const getAnnualEvolution = () => {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Array com os 12 meses do ano atual
    const monthNames = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1; // 1-12
      const monthLabel = monthNames[i];

      // Filtrar transações do mês usando extração direta da string
      const monthTransactions = transactions.filter((t) => {
        const [tYearStr, tMonthStr] = t.date.split("-");
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12

        return tMonth === month && tYear === currentYear;
      });

      return {
        mes: monthLabel,
        receita: monthTransactions
          .filter((t) => t.type === "income")
          .reduce((a, b) => a + b.amount, 0),
        despesa: monthTransactions
          .filter((t) => t.type === "expense")
          .reduce((a, b) => a + b.amount, 0),
      };
    });
  };

  const annualEvolution = getAnnualEvolution();

  useEffect(() => {
    const fetchAdvice = async () => {
      // Só busca os insights se o usuário tem direito a vê-los
      if (!shouldShowInsights) {
        setLoadingAdvice(false);
        return;
      }

      // Filtrar apenas transações do mês corrente
      const currentMonthTransactions = getCurrentMonthTransactions();

      setLoadingAdvice(true);
      const result = await getFinancialAdvice(currentMonthTransactions, goals);
      setAdvice(result);
      setLoadingAdvice(false);
    };
    fetchAdvice();
  }, [transactions, goals, shouldShowInsights]);

  return (
    <div className="space-y-6">
      {/* AI Suggestion Box - Apenas para quem contribuiu - Mobile primeiro */}
      {shouldShowInsights && (
        <div className="md:hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <button
            onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
            className="w-full p-4 md:p-6 lg:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 hover:opacity-90 transition-opacity"
          >
            <div className="p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex-shrink-0">
              <BrainCircuit size={32} className="md:w-10 md:h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="md:w-[18px] md:h-[18px] text-indigo-200 flex-shrink-0"
                />
                <h4 className="text-lg md:text-xl font-bold truncate">
                  Insights do Kako Fin
                </h4>
              </div>
              {isInsightsExpanded ? (
                <ChevronUp
                  size={20}
                  className="text-indigo-200 flex-shrink-0"
                />
              ) : (
                <ChevronDown
                  size={20}
                  className="text-indigo-200 flex-shrink-0"
                />
              )}
            </div>
          </button>

          {isInsightsExpanded && (
            <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 relative z-10">
              {loadingAdvice ? (
                <div className="flex items-center gap-2 text-indigo-100 italic text-sm md:text-base">
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                  Analisando suas finanças...
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-indigo-50 text-sm md:text-base">
                  {advice.split("\n").map((line, i) => (
                    <p key={i} className="mb-1 break-words">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl flex-shrink-0">
            <DollarSign size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">
              Saldo Atual
            </p>
            <h3
              className={`text-lg md:text-xl lg:text-2xl font-bold truncate ${
                balance >= 0 ? "text-slate-800" : "text-red-600"
              }`}
            >
              R$ {balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
            <TrendingUp size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">
              Entradas (Mês)
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 truncate">
              R${" "}
              {totalIncome.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0 sm:col-span-2 lg:col-span-1">
          <div className="p-2 md:p-3 bg-orange-50 text-orange-600 rounded-xl flex-shrink-0">
            <TrendingDown size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">
              Saídas (Mês)
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 truncate">
              R${" "}
              {totalExpense.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </h3>
          </div>
        </div>
      </div>

      {/* AI Suggestion Box - Apenas para quem contribuiu - Desktop */}
      {shouldShowInsights && (
        <div className="hidden md:block bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl text-white relative overflow-hidden shadow-xl">
          <button
            onClick={() => setIsInsightsExpanded(!isInsightsExpanded)}
            className="w-full p-4 md:p-6 lg:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 hover:opacity-90 transition-opacity"
          >
            <div className="p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex-shrink-0">
              <BrainCircuit size={32} className="md:w-10 md:h-10 text-white" />
            </div>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={16}
                  className="md:w-[18px] md:h-[18px] text-indigo-200 flex-shrink-0"
                />
                <h4 className="text-lg md:text-xl font-bold truncate">
                  Insights do Kako Fin
                </h4>
              </div>
              {isInsightsExpanded ? (
                <ChevronUp
                  size={20}
                  className="text-indigo-200 flex-shrink-0"
                />
              ) : (
                <ChevronDown
                  size={20}
                  className="text-indigo-200 flex-shrink-0"
                />
              )}
            </div>
          </button>

          {isInsightsExpanded && (
            <div className="px-4 md:px-6 lg:px-8 pb-4 md:pb-6 lg:pb-8 relative z-10">
              {loadingAdvice ? (
                <div className="flex items-center gap-2 text-indigo-100 italic text-sm md:text-base">
                  <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                  Analisando suas finanças...
                </div>
              ) : (
                <div className="prose prose-invert max-w-none text-indigo-50 text-sm md:text-base">
                  {advice.split("\n").map((line, i) => (
                    <p key={i} className="mb-1 break-words">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Decorative elements */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>
      )}

      {/* Monthly Evolution Chart */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={18} />
          Evolução Mensal (Semanas do Mês Corrente)
        </h4>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyEvolution}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(value: number) =>
                  value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  `R$ ${value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                }
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="receita"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
                name="Entradas"
              />
              <Line
                type="monotone"
                dataKey="despesa"
                stroke="#f43f5e"
                strokeWidth={4}
                dot={{ fill: "#f43f5e", r: 5 }}
                activeDot={{ r: 7 }}
                name="Despesas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Balance Evolution Chart - Saldo do Mês Corrente */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <h4 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
            <DollarSign className="text-indigo-600" size={18} />
            Saldo do Mês Corrente (Entradas, Saídas e Saldo)
          </h4>
          {balanceEvolution.length > 0 && (
            <div className="flex items-center gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Total:</span>
                <span
                  className={`font-bold ${
                    balanceEvolutionData.totalSaldoMes >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  R${" "}
                  {balanceEvolutionData.totalSaldoMes.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(value: number) =>
                  value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })
                }
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (value === null || value === undefined) return null;
                  const formattedValue = `R$ ${value.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                  let label = "";
                  if (name === "receita") label = "Entradas";
                  else if (name === "despesa") label = "Despesas";
                  else if (name === "saldo") label = "Saldo Semanal";
                  else if (name === "saldoAcumulado") label = "Saldo Acumulado";
                  return [formattedValue, label];
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Bar
                dataKey="receita"
                fill="#3b82f6"
                stroke="#2563eb"
                strokeWidth={3}
                radius={[4, 4, 0, 0]}
                name="Entradas"
              />
              <Bar
                dataKey="despesa"
                fill="#f43f5e"
                stroke="#dc2626"
                strokeWidth={3}
                radius={[4, 4, 0, 0]}
                name="Despesas"
              />
              <Bar
                dataKey="saldo"
                fill="#22c55e"
                stroke="#16a34a"
                strokeWidth={3}
                radius={[4, 4, 0, 0]}
                name="Saldo Semanal"
              >
                {combinedChartData.map((entry: any, index: number) => {
                  if (
                    !entry.isWeek ||
                    entry.saldo === null ||
                    entry.saldo === undefined
                  )
                    return null;
                  // Verde para saldo positivo, vermelho para negativo
                  const fillColor = entry.saldo >= 0 ? "#22c55e" : "#ef4444";
                  const strokeColor = entry.saldo >= 0 ? "#16a34a" : "#dc2626";
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={3}
                    />
                  );
                })}
              </Bar>
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="#6366f1"
                strokeWidth={4}
                dot={{ fill: "#6366f1", r: 5 }}
                activeDot={{ r: 7 }}
                name="Saldo Acumulado"
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Annual Evolution Chart */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={18} />
          Evolução Anual ({new Date().getFullYear()}) - Entradas e Gastos por
          Mês
        </h4>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annualEvolution}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="mes"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="receita"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ fill: "#3b82f6", r: 5 }}
                activeDot={{ r: 7 }}
                name="Entradas"
              />
              <Line
                type="monotone"
                dataKey="despesa"
                stroke="#f43f5e"
                strokeWidth={4}
                dot={{ fill: "#f43f5e", r: 5 }}
                activeDot={{ r: 7 }}
                name="Despesas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Row: Recent Transactions and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center justify-between text-sm md:text-base">
            <span>Últimas Transações</span>
            <button className="text-xs text-indigo-600 hover:underline flex-shrink-0 ml-2">
              Ver todas
            </button>
          </h4>
          <div className="space-y-3 md:space-y-4">
            {transactions.slice(0, 5).length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">
                Nenhuma transação cadastrada.
              </p>
            ) : (
              transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-2 min-w-0"
                >
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        t.type === "income"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {t.type === "income" ? (
                        <TrendingUp
                          size={14}
                          className="md:w-[18px] md:h-[18px]"
                        />
                      ) : (
                        <TrendingDown
                          size={14}
                          className="md:w-[18px] md:h-[18px]"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-xs md:text-sm truncate">
                        {t.description}
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">
                        {t.category} • {formatDateForDisplay(t.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-bold text-xs md:text-sm flex-shrink-0 ${
                      t.type === "income" ? "text-green-600" : "text-slate-800"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"} R$ {t.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base">
            Progresso das Metas
          </h4>
          <div className="space-y-4 md:space-y-6">
            {goals.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">
                Nenhuma meta cadastrada.
              </p>
            ) : (
              goals.map((goal) => {
                const progress = Math.min(
                  (goal.currentAmount / goal.targetAmount) * 100,
                  100
                );
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm gap-2">
                      <span className="font-medium text-slate-700 truncate">
                        {goal.name}
                      </span>
                      <span className="text-slate-500 flex-shrink-0 text-[10px] md:text-xs">
                        R$ {goal.currentAmount.toLocaleString()} / R${" "}
                        {goal.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 md:h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-end">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                        {progress.toFixed(0)}% concluído
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
