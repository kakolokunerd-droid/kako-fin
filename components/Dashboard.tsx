
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BrainCircuit, Sparkles, Loader2, Heart, Copy, X } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { getFinancialAdvice } from '../services/geminiService';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
  user?: { lastContributionDate?: string };
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, goals, user }) => {
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(true);
  const [showSupportBanner, setShowSupportBanner] = useState(false);

  // Função para formatar data para exibição sem problemas de timezone
  const formatDateForDisplay = (dateString: string): string => {
    // Extrair dia, mês e ano diretamente da string YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Verificar a cada minuto se deve mostrar o banner
  useEffect(() => {
    const checkBanner = () => {
      if (!user?.lastContributionDate) {
        setShowSupportBanner(true);
        return;
      }
      
      const lastContribution = new Date(user.lastContributionDate);
      const now = new Date();
      const daysSinceContribution = Math.floor((now.getTime() - lastContribution.getTime()) / (1000 * 60 * 60 * 24));
      
      setShowSupportBanner(daysSinceContribution >= 30);
    };
    
    checkBanner(); // Verificar imediatamente
    
    const interval = setInterval(checkBanner, 120000); // Verificar a cada 2 minutos

    return () => clearInterval(interval);
  }, [user?.lastContributionDate]);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText('61992459777');
      alert('PIX copiado! Chave: 61992459777');
    } catch (err) {
      // Fallback para navegadores que não suportam clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = '61992459777';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('PIX copiado! Chave: 61992459777');
      } catch (e) {
        alert('Chave PIX: 61992459777\n(Copie manualmente)');
      }
      document.body.removeChild(textArea);
    }
  };

  // Calcular totais apenas do mês atual
  const getCurrentMonthTransactions = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    return transactions.filter(t => {
      // Extrair mês e ano diretamente da string da data (formato YYYY-MM-DD) para evitar problemas de timezone
      const [yearStr, monthStr] = t.date.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr); // 1-12
      
      return month === currentMonth && year === currentYear;
    });
  };

  const currentMonthTransactions = getCurrentMonthTransactions();
  
  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Dados para gráfico de evolução semanal
  const getWeeklyEvolution = () => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return {
        dateObj: d,
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      };
    });

    return last7Days.map(({ dateObj, date }) => {
      const dayTransactions = transactions.filter(t => {
        // Extrair data diretamente da string para evitar problemas de timezone
        const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
        const dateStr = `${tYear}-${String(tMonth).padStart(2, '0')}-${String(tDay).padStart(2, '0')}`;
        const tDate = new Date(dateStr + 'T00:00:00');
        tDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === dateObj.getTime();
      });

      return {
        date,
        receita: dayTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
        despesa: dayTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
      };
    });
  };

  const weeklyEvolution = getWeeklyEvolution();

  // Dados para gráfico de evolução anual (receitas e gastos por mês)
  const getAnnualEvolution = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Array com os 12 meses do ano atual
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1; // 1-12
      const monthLabel = monthNames[i];
      
      // Filtrar transações do mês usando extração direta da string
      const monthTransactions = transactions.filter(t => {
        const [tYearStr, tMonthStr] = t.date.split('-');
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12
        
        return tMonth === month && tYear === currentYear;
      });

      return {
        mes: monthLabel,
        receita: monthTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
        despesa: monthTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)
      };
    });
  };

  const annualEvolution = getAnnualEvolution();

  useEffect(() => {
    const fetchAdvice = async () => {
      setLoadingAdvice(true);
      const result = await getFinancialAdvice(transactions, goals);
      setAdvice(result);
      setLoadingAdvice(false);
    };
    fetchAdvice();
  }, [transactions, goals]);

  return (
    <div className="space-y-6">
      {/* Support Banner - Mobile Only */}
      {showSupportBanner && (
        <div className="md:hidden bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-4 md:p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
          <button
            onClick={() => setShowSupportBanner(false)}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors z-10"
            title="Fechar"
          >
            <X size={18} />
          </button>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                <Heart size={20} className="text-pink-300" />
              </div>
              <h4 className="text-lg font-bold">Apoie o Kako Fin</h4>
            </div>
            <div className="text-sm text-indigo-50 space-y-2">
              <p>
                Sua contribuição é de <span className="font-bold">suma importância</span> para a manutenção do app e para continuarmos oferecendo este serviço gratuitamente.
              </p>
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
                <span className="font-semibold">PIX:</span>
                <code className="flex-1 bg-white/30 px-3 py-1.5 rounded-lg font-mono font-bold text-base">61992459777</code>
                <button
                  onClick={handleCopyPix}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                  title="Copiar PIX"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-xs opacity-90 italic">
                Não é obrigatório, mas sua ajuda faz toda a diferença! ❤️
              </p>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2 md:p-3 bg-green-50 text-green-600 rounded-xl flex-shrink-0">
            <DollarSign size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">Saldo Atual</p>
            <h3 className={`text-lg md:text-xl lg:text-2xl font-bold truncate ${balance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0">
          <div className="p-2 md:p-3 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
            <TrendingUp size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">Entradas (Mês)</p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 truncate">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 md:gap-4 min-w-0 sm:col-span-2 lg:col-span-1">
          <div className="p-2 md:p-3 bg-orange-50 text-orange-600 rounded-xl flex-shrink-0">
            <TrendingDown size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-slate-500 font-medium truncate">Saídas (Mês)</p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-slate-800 truncate">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      </div>

      {/* AI Suggestion Box */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-4 md:p-6 lg:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
          <div className="p-3 md:p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex-shrink-0">
            <BrainCircuit size={32} className="md:w-10 md:h-10 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="md:w-[18px] md:h-[18px] text-indigo-200 flex-shrink-0" />
              <h4 className="text-lg md:text-xl font-bold truncate">Insights do Kako Fin</h4>
            </div>
            {loadingAdvice ? (
              <div className="flex items-center gap-2 text-indigo-100 italic text-sm md:text-base">
                <Loader2 size={14} className="md:w-4 md:h-4 animate-spin" />
                Analisando suas finanças...
              </div>
            ) : (
              <div className="prose prose-invert max-w-none text-indigo-50 text-sm md:text-base">
                {advice.split('\n').map((line, i) => (
                  <p key={i} className="mb-1 break-words">{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Weekly Evolution Chart */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={18} />
          Evolução Semanal (Últimos 7 dias)
        </h4>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="receita" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Receitas"
              />
              <Line 
                type="monotone" 
                dataKey="despesa" 
                stroke="#f43f5e" 
                strokeWidth={3}
                dot={{ fill: '#f43f5e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Despesas"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Annual Evolution Chart */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base flex items-center gap-2">
          <TrendingUp className="text-indigo-600" size={18} />
          Evolução Anual ({new Date().getFullYear()}) - Receitas e Gastos por Mês
        </h4>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annualEvolution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="mes" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="receita" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', r: 4 }}
                activeDot={{ r: 6 }}
                name="Receitas"
              />
              <Line 
                type="monotone" 
                dataKey="despesa" 
                stroke="#f43f5e" 
                strokeWidth={3}
                dot={{ fill: '#f43f5e', r: 4 }}
                activeDot={{ r: 6 }}
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
            <button className="text-xs text-indigo-600 hover:underline flex-shrink-0 ml-2">Ver todas</button>
          </h4>
          <div className="space-y-3 md:space-y-4">
            {transactions.slice(0, 5).length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhuma transação cadastrada.</p>
            ) : (
              transactions.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-2 min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {t.type === 'income' ? <TrendingUp size={14} className="md:w-[18px] md:h-[18px]" /> : <TrendingDown size={14} className="md:w-[18px] md:h-[18px]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-xs md:text-sm truncate">{t.description}</p>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">{t.category} • {formatDateForDisplay(t.date)}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-xs md:text-sm flex-shrink-0 ${t.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <h4 className="font-bold text-slate-800 mb-4 text-sm md:text-base">Progresso das Metas</h4>
          <div className="space-y-4 md:space-y-6">
            {goals.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhuma meta cadastrada.</p>
            ) : (
              goals.map(goal => {
                const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between text-xs md:text-sm gap-2">
                      <span className="font-medium text-slate-700 truncate">{goal.name}</span>
                      <span className="text-slate-500 flex-shrink-0 text-[10px] md:text-xs">
                        R$ {goal.currentAmount.toLocaleString()} / R$ {goal.targetAmount.toLocaleString()}
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
