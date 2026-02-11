
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Trash2, Edit2, Calendar, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';
import { Transaction, TransactionType, Category } from '../types';
import { db } from '../services/db';

interface TransactionsProps {
  transactions: Transaction[];
  onAdd: (transaction: Omit<Transaction, 'id'>, options?: { allowDuplicate?: boolean }) => void;
  onUpdate: (id: string, transaction: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleteByMonth?: (month: number, year: number) => Promise<void>;
  showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  userEmail?: string;
}

const Transactions: React.FC<TransactionsProps> = ({ transactions, onAdd, onUpdate, onDelete, onDeleteByMonth, showToast, userEmail }) => {
  const [showDeleteMonthModal, setShowDeleteMonthModal] = useState(false);
  const [monthToDelete, setMonthToDelete] = useState<{ month: number; year: number; label: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteBulkModal, setShowDeleteBulkModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [transactionsToDelete, setTransactionsToDelete] = useState<Set<string>>(new Set());
  const [deleteSelectionMode, setDeleteSelectionMode] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  // Função para obter data local no formato YYYY-MM-DD sem problemas de timezone
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para formatar data para exibição sem problemas de timezone
  const formatDateForDisplay = (dateString: string): string => {
    // Extrair dia, mês e ano diretamente da string YYYY-MM-DD
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString());
  const [category, setCategory] = useState(Category.FOOD);
  const [type, setType] = useState<TransactionType>('expense');

  // Estado para cópia de transações entre meses
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copySourceMonth, setCopySourceMonth] = useState<{ month: number; year: number; label: string } | null>(null);
  const [copyTransactions, setCopyTransactions] = useState<Transaction[]>([]);
  const [copySelectedTransactions, setCopySelectedTransactions] = useState<Set<string>>(new Set());
  const [copyDate, setCopyDate] = useState(getLocalDateString());

  // Estado de "marcar como paga"
  const [paidTransactions, setPaidTransactions] = useState<Set<string>>(new Set());

  // Carregar estado de pagos do banco/localStorage por usuário
  useEffect(() => {
    if (!userEmail) return;
    let isMounted = true;

    const loadPaidStatus = async () => {
      try {
        const ids = await db.getPaidTransactionIds(userEmail);
        if (isMounted) {
          setPaidTransactions(new Set(ids));
        }
      } catch (error) {
        console.error('Erro ao carregar status de pagamento das transações:', error);
      }
    };

    loadPaidStatus();

    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  const togglePaid = (id: string) => {
    if (!userEmail) return;
    setPaidTransactions(prev => {
      const next = new Set(prev);
      const willBePaid = !next.has(id);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Persistir no banco/localStorage (fire-and-forget)
      db.setTransactionPaidStatus(userEmail, id, willBePaid).catch(error => {
        console.error('Erro ao atualizar status de pagamento da transação:', error);
      });
      return next;
    });
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setDate(getLocalDateString());
    setCategory(Category.FOOD);
    setType('expense');
    setEditingTransaction(null);
  };

  const handleOpenModal = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setCategory(transaction.category as Category);
      setType(transaction.type);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const transactionData = {
      description,
      amount: parseFloat(amount),
      date,
      category,
      type
    };

    if (editingTransaction) {
      onUpdate(editingTransaction.id, transactionData);
    } else {
      onAdd(transactionData);
    }

    resetForm();
    setShowModal(false);
  };

  // Confirma a cópia das transações selecionadas para a data escolhida
  const handleConfirmCopy = () => {
    if (!copySourceMonth || !copyDate) {
      if (showToast && !copyDate) {
        showToast('Escolha uma data para copiar as transações.', 'warning');
      }
      return;
    }

    const selected = copyTransactions.filter(t => copySelectedTransactions.has(t.id));

    if (selected.length === 0) {
      if (showToast) {
        showToast('Selecione ao menos uma transação para copiar.', 'warning');
      }
      return;
    }

    // Extrair ano e mês da data escolhida (mês de destino)
    const [targetYearStr, targetMonthStr] = copyDate.split('-');
    const targetYear = parseInt(targetYearStr, 10);
    const targetMonth = parseInt(targetMonthStr, 10); // 1-12

    selected.forEach(t => {
      const [, , dayStr] = t.date.split('-');
      const day = parseInt(dayStr, 10);

      // Garantir que o dia é válido para o mês de destino
      const lastDayOfTargetMonth = new Date(targetYear, targetMonth, 0).getDate(); // dia 0 do próximo mês = último dia do mês
      const safeDay = Math.min(day, lastDayOfTargetMonth);
      const newDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;

      onAdd(
        {
          description: t.description,
          amount: t.amount,
          date: newDate,
          category: t.category as Category,
          type: t.type,
        },
        { allowDuplicate: true }
      );
    });

    if (showToast) {
      showToast(`${selected.length} transação(ões) copiadas para o mês ${formatDateForDisplay(copyDate).slice(3)}`, 'success');
    }

    setShowCopyModal(false);
    setCopySourceMonth(null);
    setCopyTransactions([]);
    setCopySelectedTransactions(new Set());
    setCopyDate(getLocalDateString());
  };

  // Organizar transações por mês
  const transactionsByMonth = useMemo(() => {
    // Primeiro, remover duplicatas por ID antes de agrupar
    const uniqueTransactions = Array.from(
      new Map(transactions.map(t => [t.id, t])).values()
    );
    
    if (uniqueTransactions.length !== transactions.length) {
      console.warn(`⚠️ Removidas ${transactions.length - uniqueTransactions.length} transações duplicadas na exibição`);
    }
    
    const grouped: { [key: string]: Transaction[] } = {};
    
    uniqueTransactions.forEach(transaction => {
      // Extrair mês e ano diretamente da string da data (formato YYYY-MM-DD) para evitar problemas de timezone
      const [yearStr, monthStr] = transaction.date.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr); // 1-12
      
      // Criar chave única baseada em ano e mês
      const monthKey = `${year}-${month}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(transaction);
    });

    // Ordenar transações dentro de cada mês:
    // - Primeiro todas as DESPESAS (expense), por data ascendente
    // - Depois todas as RECEITAS (income), por data ascendente
    Object.keys(grouped).forEach(monthKey => {
      grouped[monthKey].sort((a, b) => {
        const typeWeightA = a.type === 'expense' ? 0 : 1;
        const typeWeightB = b.type === 'expense' ? 0 : 1;

        if (typeWeightA !== typeWeightB) {
          return typeWeightA - typeWeightB;
        }

        // Dentro de cada grupo (despesas ou receitas), ordenar por data ascendente
        if (a.date > b.date) return 1;
        if (a.date < b.date) return -1;
        return 0;
      });
    });

    // Converter para array com label do mês e ordenar meses
    const result = Object.entries(grouped).map(([monthKey, monthTransactions]) => {
      // Extrair mês e ano da primeira transação
      const [yearStr, monthStr] = monthTransactions[0].date.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr); // 1-12
      
      // Criar label do mês usando Date apenas para formatação
      const monthNames = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      // Para exibição no card, usar apenas o nome do mês (capitalizado)
      const monthLabel = monthNames[month - 1].charAt(0).toUpperCase() + monthNames[month - 1].slice(1);
      // Para ordenação e outras operações, manter o label completo
      const monthLabelFull = `${monthNames[month - 1]} de ${year}`;
      
      return [monthLabel, monthTransactions, monthLabelFull] as [string, Transaction[], string];
    });

    // Ordenar meses do mais recente para o mais antigo (ano/mês desc)
    return result.sort((a, b) => {
      const [yearAStr, monthAStr] = a[1][0].date.split('-');
      const [yearBStr, monthBStr] = b[1][0].date.split('-');
      const yearA = parseInt(yearAStr, 10);
      const monthA = parseInt(monthAStr, 10);
      const yearB = parseInt(yearBStr, 10);
      const monthB = parseInt(monthBStr, 10);

      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
  }, [transactions]);

  // Inicializar todos os meses como expandidos por padrão
  useEffect(() => {
    if (transactionsByMonth.length > 0) {
      const allMonths = new Set(transactionsByMonth.map(([, , monthLabelFull]) => monthLabelFull));
      setExpandedMonths(prev => {
        // Só atualiza se houver novos meses que não estão no estado atual
        const hasNewMonths = Array.from(allMonths).some(month => !prev.has(month));
        if (hasNewMonths) {
          // Mantém os meses já expandidos e adiciona os novos
          const updated = new Set(prev);
          allMonths.forEach(month => updated.add(month));
          return updated;
        }
        return prev;
      });
    }
  }, [transactionsByMonth]);

  // Calcular totais por mês
  const getMonthTotals = (transactions: Transaction[]) => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar transações..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <div className={`flex items-center gap-3 w-full ${deleteSelectionMode ? 'justify-between' : 'md:w-auto'}`}>
          {deleteSelectionMode ? (
            <>
              <button
                onClick={() => {
                  if (transactionsToDelete.size > 0) {
                    setShowDeleteBulkModal(true);
                  }
                }}
                disabled={transactionsToDelete.size === 0}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Excluir Selecionados ({transactionsToDelete.size})
              </button>
              <button
                onClick={() => {
                  setDeleteSelectionMode(false);
                  setTransactionsToDelete(new Set());
                }}
                className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-all font-semibold text-sm"
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setDeleteSelectionMode(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-100"
              >
                <Trash2 size={20} />
                Excluir
              </button>
              <button 
                onClick={() => handleOpenModal()}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold"
              >
                <Plus size={20} />
                Nova Transação
              </button>
            </>
          )}
        </div>
      </div>

      {transactionsByMonth.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center text-slate-400">
          <p className="font-medium">Nenhuma transação encontrada.</p>
          <p className="text-sm">Clique em "Nova Transação" para começar.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {transactionsByMonth.map(([monthLabel, monthTransactions, monthLabelFull]) => {
            const totals = getMonthTotals(monthTransactions);
            
            // Extrair mês e ano da primeira transação diretamente da string
            const [transactionYearStr, transactionMonthStr] = monthTransactions[0].date.split('-');
            const transactionYear = parseInt(transactionYearStr);
            const transactionMonth = parseInt(transactionMonthStr); // 1-12
            
            // Obter mês e ano atual
            const now = new Date();
            const nowMonth = now.getMonth() + 1; // 1-12
            const nowYear = now.getFullYear();
            
            // Verificar se é mês atual
            const isCurrentMonth = transactionYear === nowYear && transactionMonth === nowMonth;
            
            // Verificar se é futuro
            const isFutureMonth = transactionYear > nowYear || (transactionYear === nowYear && transactionMonth > nowMonth);

            // Status de "pago" para o mês
            const allPaidInMonth = monthTransactions.length > 0 && monthTransactions.every(t => paidTransactions.has(t.id));

            const isExpanded = expandedMonths.has(monthLabelFull);
            
            return (
              <div key={monthLabelFull} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className={`p-4 border-b ${isCurrentMonth ? 'bg-indigo-50 border-indigo-200' : isFutureMonth ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center justify-between md:justify-start gap-3">
                      <button
                        onClick={() => {
                          setExpandedMonths(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(monthLabelFull)) {
                              newSet.delete(monthLabelFull);
                            } else {
                              newSet.add(monthLabelFull);
                            }
                            return newSet;
                          });
                        }}
                        className="flex items-center gap-3 hover:opacity-70 transition-opacity flex-1 md:flex-initial"
                      >
                        <Calendar className={isCurrentMonth ? 'text-indigo-600' : isFutureMonth ? 'text-green-600' : 'text-slate-600'} size={20} />
                        <h4 className="text-lg font-bold text-slate-800">{monthLabel}</h4>
                        {isExpanded ? (
                          <ChevronUp className={isCurrentMonth ? 'text-indigo-600' : isFutureMonth ? 'text-green-600' : 'text-slate-600'} size={20} />
                        ) : (
                          <ChevronDown className={isCurrentMonth ? 'text-indigo-600' : isFutureMonth ? 'text-green-600' : 'text-slate-600'} size={20} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (!userEmail) return;

                          // Atualizar estado local
                          setPaidTransactions(prev => {
                            const next = new Set(prev);
                            if (allPaidInMonth) {
                              // Desmarcar todas como pagas
                              monthTransactions.forEach(t => next.delete(t.id));
                            } else {
                              // Marcar todas como pagas
                              monthTransactions.forEach(t => next.add(t.id));
                            }
                            return next;
                          });

                          // Persistir no banco/localStorage (fire-and-forget)
                          const willBePaid = !allPaidInMonth;
                          monthTransactions.forEach(t => {
                            db.setTransactionPaidStatus(userEmail, t.id, willBePaid).catch(error => {
                              console.error('Erro ao atualizar status de pagamento do mês:', error);
                            });
                          });
                        }}
                        className={`p-2 rounded-full transition-colors md:ml-1 ${
                          allPaidInMonth
                            ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100'
                            : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title={allPaidInMonth ? 'Desmarcar todas como pagas' : 'Marcar todas as transações deste mês como pagas'}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setCopySourceMonth({ month: transactionMonth, year: transactionYear, label: monthLabelFull });
                          setCopyTransactions(monthTransactions);
                          setCopySelectedTransactions(new Set(monthTransactions.map(t => t.id)));
                          // Data padrão: primeiro dia do próximo mês
                          const nextMonth = transactionMonth === 12 ? 1 : transactionMonth + 1;
                          const nextYear = transactionMonth === 12 ? transactionYear + 1 : transactionYear;
                          const defaultDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
                          setCopyDate(defaultDate);
                          setShowCopyModal(true);
                        }}
                        className="p-2 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-200 rounded-lg transition-colors md:ml-2"
                        title="Copiar transações deste mês para outra data"
                      >
                        <Copy size={18} />
                      </button>
                      {onDeleteByMonth && (
                        <button
                          onClick={() => {
                            setMonthToDelete({ month: transactionMonth, year: transactionYear, label: monthLabelFull });
                            setShowDeleteMonthModal(true);
                          }}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all md:ml-2"
                          title="Excluir todas as transações deste mês"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                      <div className="flex-1 sm:flex-initial text-left sm:text-right min-w-[100px]">
                        <p className="text-xs text-slate-500 font-medium mb-1">Receitas</p>
                        <p className="font-bold text-green-600 text-base sm:text-sm">
                          R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex-1 sm:flex-initial text-left sm:text-right min-w-[100px]">
                        <p className="text-xs text-slate-500 font-medium mb-1">Despesas</p>
                        <p className="font-bold text-red-600 text-base sm:text-sm">
                          R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex-1 sm:flex-initial text-left sm:text-right min-w-[100px]">
                        <p className="text-xs text-slate-500 font-medium mb-1">Saldo</p>
                        <p className={`font-bold text-base sm:text-sm ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                      <tr>
                        {deleteSelectionMode && (
                          <th className="px-6 py-4 w-12">
                            <button
                              onClick={() => {
                                if (transactionsToDelete.size === monthTransactions.length) {
                                  setTransactionsToDelete(new Set());
                                } else {
                                  setTransactionsToDelete(new Set(monthTransactions.map(t => t.id)));
                                }
                              }}
                              className="text-slate-400 hover:text-indigo-600"
                              title={transactionsToDelete.size === monthTransactions.length ? "Desmarcar Todos" : "Selecionar Todos"}
                            >
                              {transactionsToDelete.size === monthTransactions.length ? '☑' : '☐'}
                            </button>
                          </th>
                        )}
                        <th className="px-6 py-4">Descrição</th>
                        <th className="px-6 py-4">Categoria</th>
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4 text-right">Valor</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthTransactions.map((t) => {
                        const isSelectedForDelete = transactionsToDelete.has(t.id);
                        const isPaid = paidTransactions.has(t.id);
                        const textBaseClass = isPaid ? 'line-through text-slate-400' : '';
                        return (
                          <tr key={t.id} className={`hover:bg-slate-50/50 transition-colors ${isPaid ? 'bg-slate-50' : ''}`}>
                            {deleteSelectionMode && (
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  checked={isSelectedForDelete}
                                  onChange={() => {
                                    setTransactionsToDelete(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(t.id)) {
                                        newSet.delete(t.id);
                                      } else {
                                        newSet.add(t.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <div className={`font-semibold ${isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.description}</div>
                              <div className={`text-xs md:hidden ${isPaid ? 'text-slate-300 line-through' : 'text-slate-400'}`}>{t.category}</div>
                            </td>
                            <td className={`px-6 py-4 text-sm ${isPaid ? 'text-slate-300 line-through' : 'text-slate-600'}`}>{t.category}</td>
                            <td className={`px-6 py-4 text-sm ${isPaid ? 'text-slate-300 line-through' : 'text-slate-600'}`}>
                              {formatDateForDisplay(t.date)}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold text-sm ${
                              isPaid
                                ? 'text-slate-300 line-through'
                                : t.type === 'income'
                                  ? 'text-green-600'
                                  : 'text-slate-700'
                            }`}>
                              {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {!deleteSelectionMode && (
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => togglePaid(t.id)}
                                    className={`p-2 rounded-full transition-colors ${
                                      isPaid
                                        ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100'
                                        : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100'
                                    }`}
                                    title={isPaid ? 'Marcar como não paga' : 'Marcar como paga'}
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => !isPaid && handleOpenModal(t)}
                                    disabled={isPaid}
                                    className={`p-2 rounded-full transition-colors ${
                                      isPaid
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-200'
                                    }`}
                                    title={isPaid ? 'Desmarque como paga para editar' : 'Editar transação'}
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setTransactionToDelete(t.id);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-2 rounded-full text-red-600 hover:text-red-800 hover:bg-red-100 transition-colors"
                                    title="Excluir transação"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual */}
      {showDeleteModal && transactionToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6">
              {(() => {
                const transaction = transactions.find(t => t.id === transactionToDelete);
                if (!transaction) return null;
                return (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <p className="font-bold text-slate-800">{transaction.description}</p>
                    <p className="text-sm text-slate-600">Categoria: {transaction.category}</p>
                    <p className="text-sm text-slate-600">
                      Valor: {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600">Data: {formatDateForDisplay(transaction.date)}</p>
                  </div>
                );
              })()}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setTransactionToDelete(null);
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (transactionToDelete) {
                    try {
                      await onDelete(transactionToDelete);
                      setShowDeleteModal(false);
                      setTransactionToDelete(null);
                      // O toast já é mostrado na função onDelete
                    } catch (error) {
                      console.error('Erro ao excluir transação:', error);
                      if (showToast) {
                        showToast('Erro ao excluir transação. Tente novamente.', 'error');
                      }
                    }
                  }
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Lote */}
      {showDeleteBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão em Lote</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tem certeza que deseja excluir {transactionsToDelete.size} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {Array.from(transactionsToDelete).map(id => {
                  const transaction = transactions.find(t => t.id === id);
                  if (!transaction) return null;
                  return (
                    <div key={id} className="bg-slate-50 rounded-xl p-3">
                      <p className="font-semibold text-slate-800">{transaction.description}</p>
                      <p className="text-xs text-slate-600">{transaction.category} - {formatDateForDisplay(transaction.date)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteBulkModal(false);
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const idsToDelete = Array.from(transactionsToDelete);
                  try {
                    for (const id of idsToDelete) {
                      await onDelete(id);
                    }
                    setShowDeleteBulkModal(false);
                    setDeleteSelectionMode(false);
                    setTransactionsToDelete(new Set());
                    if (showToast) {
                      showToast(`${idsToDelete.length} transação(ões) excluída(s) com sucesso!`, 'success');
                    }
                  } catch (error) {
                    console.error('Erro ao excluir transações:', error);
                    if (showToast) {
                      showToast('Erro ao excluir transações. Tente novamente.', 'error');
                    }
                  }
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl"
              >
                Confirmar Exclusão ({transactionsToDelete.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão do Mês */}
      {showDeleteMonthModal && monthToDelete && onDeleteByMonth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão do Mês</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tem certeza que deseja excluir todas as transações de <strong>{monthToDelete.label}</strong>? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">
                  <strong>Atenção:</strong> Todas as transações deste mês serão excluídas permanentemente do banco de dados.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteMonthModal(false);
                  setMonthToDelete(null);
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (monthToDelete && onDeleteByMonth) {
                    await onDeleteByMonth(monthToDelete.month, monthToDelete.year);
                    setShowDeleteMonthModal(false);
                    setMonthToDelete(null);
                    if (showToast) {
                      showToast(`Todas as transações de ${monthToDelete.label} foram excluídas!`, 'success');
                    }
                  }
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cópia de Transações entre Meses */}
      {showCopyModal && copySourceMonth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                Copiar transações de {copySourceMonth.label}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Selecione quais transações deseja copiar e escolha a <strong>data de migração</strong> para o novo mês.
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Data para migração
                </label>
                <input
                  type="date"
                  value={copyDate}
                  onChange={(e) => setCopyDate(e.target.value)}
                  className="w-full md:w-64 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Todas as transações selecionadas serão copiadas para esta data.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                  <span>
                    {copySelectedTransactions.size} de {copyTransactions.length} transação(ões) selecionada(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (copySelectedTransactions.size === copyTransactions.length) {
                        setCopySelectedTransactions(new Set());
                      } else {
                        setCopySelectedTransactions(new Set(copyTransactions.map(t => t.id)));
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    {copySelectedTransactions.size === copyTransactions.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3 w-10"></th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Categoria</th>
                        <th className="px-4 py-3">Data original</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {copyTransactions.map((t) => {
                        const isSelected = copySelectedTransactions.has(t.id);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setCopySelectedTransactions((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(t.id)) {
                                      next.delete(t.id);
                                    } else {
                                      next.add(t.id);
                                    }
                                    return next;
                                  });
                                }}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800 text-xs md:text-sm">
                                {t.description}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {t.category}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {formatDateForDisplay(t.date)}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold text-xs md:text-sm ${t.type === 'income' ? 'text-green-600' : 'text-slate-700'}`}>
                              {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCopyModal(false);
                  setCopySourceMonth(null);
                  setCopyTransactions([]);
                  setCopySelectedTransactions(new Set());
                  setCopyDate(getLocalDateString());
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCopy}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={copySelectedTransactions.size === 0 || !copyDate}
              >
                Copiar {copySelectedTransactions.size > 0 ? `(${copySelectedTransactions.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={`py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Gasto
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={`py-2.5 text-sm font-bold rounded-lg transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Supermercado, Aluguel..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0,00"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.values(Category).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl"
                >
                  {editingTransaction ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
