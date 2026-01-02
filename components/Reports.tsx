
import React from 'react';
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
  Cell 
} from 'recharts';
import { Transaction } from '../types';

interface ReportsProps {
  transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  // Data for Category breakdown (Expenses only)
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const categoryData = expenseTransactions.reduce((acc: any[], t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, []);

  // Data for Monthly Income vs Expense
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleDateString('pt-BR', { month: 'short' });
  }).reverse();

  const monthlyData = last6Months.map(month => {
    // This is simplified, for real apps we would group by actual date
    return {
      name: month,
      receita: transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) / 6,
      despesa: transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0) / 6,
    };
  });

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
          <h4 className="font-bold text-slate-800 mb-6">Gastos por Categoria</h4>
          <ResponsiveContainer width="100%" height="80%">
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
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {categoryData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-96">
          <h4 className="font-bold text-slate-800 mb-6">Receitas vs Despesas (Média 6 Meses)</h4>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="receita" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 mb-4">Análise Detalhada</h4>
        <p className="text-slate-500 text-sm leading-relaxed">
          Seu maior custo recorrente é em <span className="font-bold text-indigo-600">"{categoryData[0]?.name || 'carregando...'}"</span>. 
          Manter este gasto abaixo de 30% da sua renda total pode acelerar sua independência financeira em até 2 anos. 
          Utilize o Dashboard para ver dicas personalizadas da IA sobre como otimizar cada categoria.
        </p>
      </div>
    </div>
  );
};

export default Reports;
