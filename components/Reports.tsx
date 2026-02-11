
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Transaction, Goal, AuthState } from '../types';
import { TrendingUp, TrendingDown, Target, Calendar, Zap, BarChart3 } from 'lucide-react';
import SubscriptionBlock from './SubscriptionBlock';

interface ReportsProps {
  transactions: Transaction[];
  goals: Goal[];
  auth: AuthState;
}

type ReportType = 'transactions' | 'goals';

const Reports: React.FC<ReportsProps> = ({ transactions, goals, auth }) => {
  const [activeTab, setActiveTab] = useState<ReportType>('transactions');

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  // ========== TRANSACTIONS REPORTS ==========
  
  // 1. Gastos por Categoria
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryData = expenseTransactions.reduce((acc: any[], t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // 2. Receitas vs Despesas por Mês (6 meses para trás + mês atual + 6 meses para frente)
  const getMonthlyData = () => {
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    // Criar array com 13 meses: 6 passados + atual + 6 futuros
    const months = Array.from({ length: 13 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6 + i); // -6 até +6 (total 13 meses)
      const month = d.getMonth() + 1; // 1-12
      const year = d.getFullYear();
      const monthName = monthNames[d.getMonth()];
      
      return {
        month, // 1-12
        year,
        label: `${monthName}/${year}`
      };
    });

    return months.map(({ month, year, label }) => {
      // Filtrar transações usando extração direta da string para evitar problemas de timezone
      const monthTransactions = transactions.filter(t => {
        const [tYearStr, tMonthStr] = t.date.split('-');
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12
        
        return tMonth === month && tYear === year;
      });

      return {
        name: label,
        receita: monthTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0),
        despesa: monthTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0),
      };
    });
  };

  const monthlyData = getMonthlyData();

  // 3. Evolução de Saldo
  const getBalanceEvolution = () => {
    // Ordenar transações por data (comparação direta de strings YYYY-MM-DD)
    const sortedTransactions = [...transactions].sort((a, b) => {
      if (a.date > b.date) return 1;
      if (a.date < b.date) return -1;
      return 0;
    });
    
    let balance = 0;
    return sortedTransactions.map(t => {
      balance += t.type === 'income' ? t.amount : -t.amount;
      
      // Formatar data para exibição sem usar new Date() para evitar problemas de timezone
      const [year, month, day] = t.date.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = monthNames[parseInt(month) - 1];
      
      return {
        date: `${day}/${monthName}`,
        saldo: balance
      };
    }).slice(-30); // Últimos 30 registros
  };

  const balanceEvolution = getBalanceEvolution();

  // 4. Top 5 Maiores Gastos (sem duplicatas por descrição)
  const seenDescriptions = new Set<string>();
  const topExpenses = [...expenseTransactions]
    .sort((a, b) => b.amount - a.amount)
    .filter(t => {
      const key = t.description.toLowerCase().trim();
      if (seenDescriptions.has(key)) {
        return false; // Já existe uma transação com essa descrição, pula
      }
      seenDescriptions.add(key);
      return true;
    })
    .slice(0, 5)
    .map(t => ({
      name: t.description.length > 20 ? t.description.substring(0, 20) + '...' : t.description,
      value: t.amount,
      category: t.category
    }));

  // 5. Análise de Tendências (Últimos 3 meses)
  const getTrendAnalysis = () => {
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    const last3Months = Array.from({ length: 3 }).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (2 - i));
      const month = d.getMonth() + 1; // 1-12
      const year = d.getFullYear();
      const monthName = monthNames[d.getMonth()];
      
      return {
        month, // 1-12
        year,
        label: monthName
      };
    });

    return last3Months.map(({ month, year, label }) => {
      // Filtrar transações usando extração direta da string para evitar problemas de timezone
      const monthTransactions = transactions.filter(t => {
        const [tYearStr, tMonthStr] = t.date.split('-');
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12
        
        return tMonth === month && tYear === year;
      });

      const income = monthTransactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

      return {
        name: label,
        receita: income,
        despesa: expense,
        saldo: income - expense
      };
    });
  };

  const trendData = getTrendAnalysis();

  // ========== GOALS REPORTS ==========

  // 1. Progresso Geral das Metas
  const goalsProgress = goals.map(goal => ({
    name: goal.name.length > 15 ? goal.name.substring(0, 15) + '...' : goal.name,
    progress: Math.min((goal.currentAmount / goal.targetAmount) * 100, 100),
    current: goal.currentAmount,
    target: goal.targetAmount
  }));

  // 2. Metas por Prazo
  const getGoalsByDeadline = () => {
    const now = new Date();
    const upcoming = goals.filter(g => new Date(g.deadline) >= now);
    const overdue = goals.filter(g => new Date(g.deadline) < now && g.currentAmount < g.targetAmount);
    const completed = goals.filter(g => g.currentAmount >= g.targetAmount);

    return [
      { name: 'Concluídas', value: completed.length, color: '#22c55e' },
      { name: 'Em Andamento', value: upcoming.length, color: '#6366f1' },
      { name: 'Atrasadas', value: overdue.length, color: '#f43f5e' }
    ];
  };

  const goalsByDeadline = getGoalsByDeadline();

  // 3. Velocidade de Economia
  const getSavingsVelocity = () => {
    return goals.map(goal => {
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const daysRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const remaining = goal.targetAmount - goal.currentAmount;
      const dailyNeeded = remaining / daysRemaining;
      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - new Date(goal.deadline).getTime() + (deadline.getTime() - now.getTime())) / (1000 * 60 * 60 * 24)));
      const dailyAverage = goal.currentAmount / daysElapsed;

      return {
        name: goal.name.length > 12 ? goal.name.substring(0, 12) + '...' : goal.name,
        necessario: dailyNeeded,
        atual: dailyAverage,
        status: dailyAverage >= dailyNeeded ? 'No Prazo' : 'Atrasado'
      };
    });
  };

  const savingsVelocity = getSavingsVelocity();

  // 4. Comparação de Metas
  const goalsComparison = goals.map(goal => ({
    name: goal.name.length > 10 ? goal.name.substring(0, 10) + '...' : goal.name,
    atual: goal.currentAmount,
    meta: goal.targetAmount,
    percentual: Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  }));

  // 5. Projeção de Conclusão
  const getCompletionProjection = () => {
    return goals.map(goal => {
      const deadline = new Date(goal.deadline);
      const now = new Date();
      const daysRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const remaining = goal.targetAmount - goal.currentAmount;
      const dailyNeeded = remaining / daysRemaining;
      
      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - new Date(goal.deadline).getTime() + (deadline.getTime() - now.getTime())) / (1000 * 60 * 60 * 24)));
      const dailyAverage = goal.currentAmount / daysElapsed;
      
      const projectedDays = dailyAverage > 0 ? remaining / dailyAverage : Infinity;
      const projectedDate = new Date(now.getTime() + projectedDays * 24 * 60 * 60 * 1000);

      return {
        name: goal.name.length > 12 ? goal.name.substring(0, 12) + '...' : goal.name,
        prazo: daysRemaining,
        projetado: Math.ceil(projectedDays),
        status: projectedDays <= daysRemaining ? 'No Prazo' : 'Atrasado'
      };
    });
  };

  const completionProjection = getCompletionProjection();

  return (
    <SubscriptionBlock feature="reports" auth={auth}>
      <div className="space-y-6">
        {/* Tab Selector */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 inline-flex gap-2">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={18} />
          Transações
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
            activeTab === 'goals'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Target size={18} />
          Metas
        </button>
      </div>

      {activeTab === 'transactions' ? (
        <div className="space-y-6">
          {/* Report 1: Gastos por Categoria */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingDown className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">1. Gastos por Categoria</h4>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
              <div className="w-full lg:w-1/2 flex justify-center flex-shrink-0">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full lg:w-1/2">
                <div className="grid grid-cols-3 gap-2">
                  {categoryData.map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 transition-colors text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="text-xs text-slate-700 font-semibold">{item.name}</span>
                      </div>
                      <span className="text-xs text-slate-600 font-bold">
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Report 2: Receitas vs Despesas Mensais */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">2. Receitas vs Despesas (6 Meses Passados e 6 Futuros)</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report 3: Evolução de Saldo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">3. Evolução de Saldo</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={balanceEvolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="saldo" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Report 4: Top 5 Maiores Gastos */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">4. Top 5 Maiores Gastos</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={topExpenses} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={100}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report 5: Análise de Tendências */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">5. Análise de Tendências (Últimos 3 Meses)</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="receita" stroke="#22c55e" strokeWidth={3} name="Receitas" />
                <Line type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={3} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={3} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Report 1: Progresso Geral das Metas */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <Target className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">1. Progresso Geral das Metas</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={goalsProgress}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="progress" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report 2: Metas por Prazo */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">2. Metas por Status</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={goalsByDeadline}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {goalsByDeadline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `${value} meta(s)`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {goalsByDeadline.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Report 3: Velocidade de Economia */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <Zap className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">3. Velocidade de Economia (R$/dia)</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={savingsVelocity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/dia`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="necessario" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Necessário" />
                <Bar dataKey="atual" fill="#22c55e" radius={[4, 4, 0, 0]} name="Atual" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report 4: Comparação de Metas */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">4. Comparação de Metas</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={goalsComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="atual" fill="#6366f1" radius={[4, 4, 0, 0]} name="Atual" />
                <Bar dataKey="meta" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Report 5: Projeção de Conclusão */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="text-indigo-600" size={20} />
              <h4 className="font-bold text-slate-800">5. Projeção de Conclusão (dias)</h4>
            </div>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={completionProjection}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(value: number) => `${value} dias`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Bar dataKey="prazo" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Prazo" />
                <Bar dataKey="projetado" fill="#22c55e" radius={[4, 4, 0, 0]} name="Projetado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>
    </SubscriptionBlock>
  );
};

export default Reports;
