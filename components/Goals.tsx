
import React, { useState } from 'react';
import { Plus, Target, Trash2, Share2 } from 'lucide-react';
import { Goal } from '../types';

interface GoalsProps {
  goals: Goal[];
  onAdd: (goal: Omit<Goal, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, amount: number) => void;
}

const Goals: React.FC<GoalsProps> = ({ goals, onAdd, onDelete, onUpdateProgress }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !target) return;
    onAdd({
      name,
      targetAmount: parseFloat(target),
      currentAmount: 0,
      deadline
    });
    setName(''); setTarget(''); setDeadline(''); setShowModal(false);
  };

  const handleShareGoal = (goal: Goal) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const deadlineFormatted = new Date(goal.deadline).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const message = `🎯 *Estou trabalhando na minha meta: ${goal.name}*

💰 Progresso: R$ ${goal.currentAmount.toLocaleString('pt-BR')} de R$ ${goal.targetAmount.toLocaleString('pt-BR')} (${progress.toFixed(0)}%)
📅 Prazo: ${deadlineFormatted}

💡 Que tal você também criar suas próprias metas financeiras? 

📱 Baixe o Kako Fin e comece a planejar seus sonhos hoje mesmo:
https://kako-fin.vercel.app/

✨ Vamos juntos rumo à liberdade financeira!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Suas Metas Financeiras</h3>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-100"
        >
          <Plus size={20} />
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          return (
            <div key={goal.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleShareGoal(goal)}
                  className="text-slate-300 hover:text-green-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Compartilhar via WhatsApp"
                >
                  <Share2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(goal.id)}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Excluir meta"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Target size={24} />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">{goal.name}</h4>
              <p className="text-xs text-slate-400 mb-4">Prazo: {new Date(goal.deadline).toLocaleDateString()}</p>
              
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-slate-600">R$ {goal.currentAmount.toLocaleString()} de R$ {goal.targetAmount.toLocaleString()}</span>
                <span className="text-indigo-600">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    const add = prompt('Quanto você deseja adicionar a esta meta?');
                    if (add) onUpdateProgress(goal.id, parseFloat(add));
                  }}
                  className="flex-1 text-xs font-bold py-2 px-4 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg hover:bg-white hover:border-indigo-200 transition-all"
                >
                  Adicionar Economia
                </button>
                <button 
                  onClick={() => handleShareGoal(goal)}
                  className="px-3 py-2 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 transition-all flex items-center justify-center"
                  title="Compartilhar via WhatsApp"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Target size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Nenhuma meta definida ainda.</p>
            <p className="text-sm">Comece a planejar seus sonhos hoje!</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Cadastrar Meta</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Meta</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Viagem de Férias, Reserva de Emergência..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Alvo (R$)</label>
                <input 
                  type="number" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Limite</label>
                <input 
                  type="date" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl">Criar Meta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
