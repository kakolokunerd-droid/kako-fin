
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, BrainCircuit, Sparkles, Loader2 } from 'lucide-react';
import { Transaction, Goal } from '../types';
import { getFinancialAdvice } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
  goals: Goal[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, goals }) => {
  const [advice, setAdvice] = useState<string>("");
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(true);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpense;

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
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">{t.category} • {new Date(t.date).toLocaleDateString()}</p>
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
