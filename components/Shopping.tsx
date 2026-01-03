
import React, { useState, useMemo } from 'react';
import { Plus, ShoppingCart, Calendar, CreditCard, DollarSign, Edit2, Trash2, Package, Copy, Share2 } from 'lucide-react';
import { ShoppingItem, PurchaseType, Category } from '../types';

interface ShoppingProps {
  shoppingItems: ShoppingItem[];
  onAdd: (item: Omit<ShoppingItem, 'id'>) => void;
  onUpdate: (id: string, item: Omit<ShoppingItem, 'id'>) => void;
  onDelete: (id: string) => Promise<void>;
  onAddToTransactions: (transactions: Array<{ description: string; amount: number; date: string; category: string; type: 'expense' }>, month?: number, year?: number, parceledItemNames?: Set<string>) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const Shopping: React.FC<ShoppingProps> = ({ shoppingItems, onAdd, onUpdate, onDelete, onAddToTransactions, showToast }) => {
  const [showModal, setShowModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteBulkModal, setShowDeleteBulkModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<Set<string>>(new Set());
  const [deleteSelectionMode, setDeleteSelectionMode] = useState(false);
  const [copySourceItems, setCopySourceItems] = useState<ShoppingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [copyTargetMonth, setCopyTargetMonth] = useState('');
  const [copyTargetYear, setCopyTargetYear] = useState('');
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PurchaseType>('cash');
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

  const [purchaseDate, setPurchaseDate] = useState(getLocalDateString());
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [category, setCategory] = useState(Category.FOOD);

  const resetForm = () => {
    setName('');
    setType('cash');
    setPurchaseDate(getLocalDateString());
    setAmount('');
    setInstallments('1');
    setCategory(Category.FOOD);
    setEditingItem(null);
  };

  const handleOpenModal = (item?: ShoppingItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setType(item.type);
      setPurchaseDate(item.purchaseDate);
      setAmount(item.amount.toString());
      setInstallments(item.installments?.toString() || '1');
      setCategory(item.category as Category);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const itemData = {
      name,
      type,
      purchaseDate,
      amount: parseFloat(amount),
      category,
      ...(type === 'installment' && { installments: parseInt(installments) })
    };

    if (editingItem) {
      onUpdate(editingItem.id, itemData);
    } else {
      onAdd(itemData);
    }

    resetForm();
    setShowModal(false);
  };

  const handleAddMonthToTransactions = async (items: ShoppingItem[], monthLabel: string) => {
    if (items.length === 0) {
      showToast('Nenhum item para adicionar às transações.', 'info');
      return;
    }
    
    // Extrair mês e ano diretamente da string da data (formato YYYY-MM-DD) para evitar problemas de timezone
    const firstItemDate = items[0].purchaseDate; // Formato: YYYY-MM-DD
    const [referenceYearStr, referenceMonthStr] = firstItemDate.split('-');
    const referenceYear = parseInt(referenceYearStr);
    const referenceMonthNum = parseInt(referenceMonthStr); // 1-12 para uso em strings
    
    console.log('🔄 Processando transações para o mês:', {
      monthLabel,
      referenceMonth: referenceMonthNum,
      referenceYear,
      itemsCount: items.length
    });
    
    // Identificar apenas os itens parcelados do mês que está sendo processado
    // Isso garante que apenas as parcelas deste mês sejam recalculadas
    const monthParceledItems = items.filter(item => item.type === 'installment');
    const parceledItemNames = new Set(monthParceledItems.map(item => item.name));
    
    console.log('📦 Itens parcelados do mês identificados:', Array.from(parceledItemNames));
    
    // Agora processar apenas os itens do mês selecionado
    const transactions: Array<{ description: string; amount: number; date: string; category: string; type: 'expense' }> = [];
    
    items.forEach(item => {
      // Extrair mês e ano diretamente da string da data
      const [itemYearStr, itemMonthStr] = item.purchaseDate.split('-');
      const itemYear = parseInt(itemYearStr);
      const itemMonth = parseInt(itemMonthStr);
      
      // Verificar se o item pertence ao mês de referência do card
      if (itemMonth !== referenceMonthNum || itemYear !== referenceYear) {
        console.log('Item ignorado (não pertence ao mês do card):', {
          name: item.name,
          itemDate: item.purchaseDate,
          itemMonth,
          itemYear,
          referenceMonth: referenceMonthNum,
          referenceYear
        });
        return; // Pular itens que não pertencem ao mês do card
      }
      
      if (item.type === 'cash') {
        // Compra à vista: adiciona transação no primeiro dia do mês de referência
        const referenceDateFormatted = `${referenceYear}-${String(referenceMonthNum).padStart(2, '0')}-01`;
        transactions.push({
          description: item.name,
          amount: item.amount,
          date: referenceDateFormatted,
          category: item.category,
          type: 'expense'
        });
        console.log('✅ Adicionando compra à vista:', item.name, referenceDateFormatted);
      } else {
        // Compra parcelada: calcular valor da parcela e adicionar apenas parcelas do mês de referência ou futuras
        const installmentAmount = item.amount / (item.installments || 1);
        
        // Extrair mês e ano da data de compra
        const [purchaseYearStr, purchaseMonthStr] = item.purchaseDate.split('-');
        const purchaseYear = parseInt(purchaseYearStr);
        const purchaseMonth = parseInt(purchaseMonthStr);
        
        console.log('📅 Processando compra parcelada:', {
          itemName: item.name,
          purchaseDate: item.purchaseDate,
          purchaseMonth,
          purchaseYear,
          referenceMonth: referenceMonthNum,
          referenceYear,
          installments: item.installments,
          totalAmount: item.amount,
          installmentAmount
        });
        
        // Adicionar apenas as parcelas que pertencem ao mês de referência ou são futuras
        for (let i = 0; i < (item.installments || 1); i++) {
          // Calcular o mês e ano da parcela
          let parcelMonth = purchaseMonth + i;
          let parcelYear = purchaseYear;
          
          // Ajustar se passar de dezembro
          while (parcelMonth > 12) {
            parcelMonth -= 12;
            parcelYear += 1;
          }
          
          // Verificar se a parcela pertence ao mês de referência ou é futura
          const isReferenceMonth = parcelMonth === referenceMonthNum && parcelYear === referenceYear;
          const isFutureMonth = (parcelYear > referenceYear) || (parcelYear === referenceYear && parcelMonth > referenceMonthNum);
          
          // Adicionar apenas se for do mês de referência ou futura
          if (isReferenceMonth || isFutureMonth) {
            // Criar data da parcela (primeiro dia do mês)
            const parcelDate = `${parcelYear}-${String(parcelMonth).padStart(2, '0')}-01`;
            
            transactions.push({
              description: `${item.name} (${i + 1}/${item.installments})`,
              amount: installmentAmount, // Valor da parcela (total dividido por número de parcelas)
              date: parcelDate,
              category: item.category,
              type: 'expense'
            });
            
            console.log(`  💰 Parcela ${i + 1}/${item.installments}: R$ ${installmentAmount.toFixed(2)} em ${parcelDate} (${isReferenceMonth ? 'mês de referência' : 'futura'})`);
          } else {
            console.log(`  ⏭️ Parcela ${i + 1}/${item.installments} ignorada (mês passado: ${parcelMonth}/${parcelYear})`);
          }
        }
      }
    });
    
    // Identificar os nomes dos itens que estão sendo adicionados (para remover apenas esses)
    const itemNamesToUpdate = new Set(items.map(item => item.name));
    
    console.log('📊 Total de transações a serem adicionadas:', transactions.length);
    console.log('📦 Itens que serão atualizados:', Array.from(itemNamesToUpdate));
    console.log('🗑️ Serão removidas apenas as transações relacionadas a estes itens do mês:', referenceMonthNum, '/', referenceYear);
    console.log('⚠️ Parcelas de compras parceladas de outros itens serão preservadas');
    
    if (transactions.length > 0) {
      // Passar os nomes dos itens para remover apenas as transações relacionadas a eles
      // Parcelas de outros itens parcelados serão preservadas
      try {
        await onAddToTransactions(transactions, referenceMonthNum, referenceYear, itemNamesToUpdate);
        showToast(`${transactions.length} transação(ões) adicionada(s) às transações do mês de ${monthLabel}!`, 'success');
      } catch (error) {
        console.error('❌ Erro ao adicionar transações:', error);
        showToast('Erro ao adicionar transações. Tente novamente.', 'error');
      }
    } else {
      showToast('Nenhuma transação a ser adicionada para este mês.', 'info');
    }
  };

  // Organizar compras por mês
  const itemsByMonth = useMemo(() => {
    const grouped: { [key: string]: ShoppingItem[] } = {};
    
    shoppingItems.forEach(item => {
      const date = new Date(item.purchaseDate + 'T00:00:00'); // Adicionar hora para evitar problemas de timezone
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(item);
    });

    // Converter para array com label do mês e ordenar meses
    const result = Object.entries(grouped).map(([monthKey, monthItems]) => {
      // Obter label do mês a partir da primeira transação
      const firstDate = new Date(monthItems[0].purchaseDate + 'T00:00:00');
      const monthLabel = firstDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      return [monthLabel, monthItems] as [string, ShoppingItem[]];
    });

    // Ordenar meses
    return result.sort((a, b) => {
      const dateA = new Date(a[1][0].purchaseDate + 'T00:00:00');
      const dateB = new Date(b[1][0].purchaseDate + 'T00:00:00');
      return dateA.getTime() - dateB.getTime();
    });
  }, [shoppingItems]);

  // Calcular total por mês
  const getMonthTotal = (items: ShoppingItem[]) => {
    return items.reduce((sum, item) => {
      if (item.type === 'cash') {
        return sum + item.amount;
      } else {
        // Para parceladas, mostrar o valor da parcela mensal
        return sum + (item.amount / (item.installments || 1));
      }
    }, 0);
  };

  const handleOpenCopyModal = (items: ShoppingItem[]) => {
    setCopySourceItems(items);
    // Selecionar todos os itens por padrão
    setSelectedItems(new Set(items.map(item => item.id)));
    const now = new Date();
    setCopyTargetMonth('');
    setCopyTargetYear('');
    setShowCopyModal(true);
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(copySourceItems.map(item => item.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  const handleCopyItems = () => {
    if (!copyTargetMonth || !copyTargetYear) {
      showToast('Por favor, selecione o mês e ano de destino.', 'warning');
      return;
    }

    if (selectedItems.size === 0) {
      showToast('Por favor, selecione pelo menos um item para copiar.', 'warning');
      return;
    }

    const targetMonthNum = parseInt(copyTargetMonth);
    const targetYearNum = parseInt(copyTargetYear);
    
    // Validar se os valores são válidos
    if (isNaN(targetMonthNum) || isNaN(targetYearNum) || targetMonthNum < 1 || targetMonthNum > 12) {
      showToast('Mês ou ano inválido. Por favor, selecione novamente.', 'error');
      return;
    }

    // Criar data no formato YYYY-MM-DD diretamente (primeiro dia do mês)
    const formattedDate = `${targetYearNum}-${String(targetMonthNum).padStart(2, '0')}-01`;

    console.log('Copiando itens:', {
      targetMonth: targetMonthNum,
      targetYear: targetYearNum,
      formattedDate,
      selectedItems: Array.from(selectedItems),
      sourceItems: copySourceItems.map(i => ({ id: i.id, name: i.name, date: i.purchaseDate }))
    });

    let copiedCount = 0;
    const itemsToAdd: Omit<ShoppingItem, 'id'>[] = [];

    // Copiar apenas os itens selecionados
    copySourceItems.forEach(item => {
      if (!selectedItems.has(item.id)) {
        return; // Pular itens não selecionados
      }

      const newItem: Omit<ShoppingItem, 'id'> = {
        name: item.name,
        type: item.type,
        purchaseDate: formattedDate, // Usar a mesma data para todos (primeiro dia do mês selecionado)
        amount: item.amount,
        category: item.category,
        ...(item.type === 'installment' && { installments: item.installments })
      };

      console.log('Item a ser copiado:', {
        original: { name: item.name, date: item.purchaseDate },
        novo: { name: newItem.name, date: newItem.purchaseDate }
      });

      itemsToAdd.push(newItem);
      copiedCount++;
    });

    console.log('Itens a serem adicionados:', itemsToAdd.map(i => ({ name: i.name, date: i.purchaseDate })));

    // Adicionar todos os itens de uma vez usando a forma funcional do setState
    itemsToAdd.forEach(item => {
      onAdd(item);
    });

    const targetMonthLabel = new Date(targetYearNum, targetMonthNum - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    showToast(`${copiedCount} item(ns) copiado(s) para ${targetMonthLabel}!`, 'success');
    setShowCopyModal(false);
    setCopySourceItems([]);
    setSelectedItems(new Set());
  };

  const handleShareShoppingList = (items?: ShoppingItem[], monthLabel?: string) => {
    // Se items e monthLabel foram fornecidos, compartilhar apenas aquele mês
    const itemsToShare = items || shoppingItems;
    
    if (itemsToShare.length === 0) {
      showToast('Não há itens na lista de compras para compartilhar.', 'info');
      return;
    }

    // Criar mensagem formatada
    let message = `🛒 *${monthLabel ? `LISTA DE COMPRAS - ${monthLabel.toUpperCase()}` : 'MINHA LISTA DE COMPRAS'}*\n\n`;
    
    if (monthLabel) {
      // Compartilhar apenas um mês
      message += `📅 *${monthLabel}*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      let monthTotal = 0;
      
      itemsToShare.forEach(item => {
        const installmentAmount = item.type === 'installment' ? item.amount / (item.installments || 1) : item.amount;
        monthTotal += item.type === 'cash' ? item.amount : installmentAmount;
        
        // Para parceladas, mostrar apenas o valor da parcela
        const displayAmount = item.type === 'installment' ? installmentAmount : item.amount;
        
        message += `🛍️ *${item.name}*\n`;
        message += `   💰 R$ ${displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        
        if (item.type === 'installment') {
          message += `   (${item.installments}x)\n`;
        }
        
        message += `\n`;
      });
      
      message += `💰 *Total do mês: R$ ${monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    } else {
      // Compartilhar todos os meses (lógica original)
      const itemsByMonthMap: { [key: string]: ShoppingItem[] } = {};
      
      itemsToShare.forEach(item => {
        const [yearStr, monthStr] = item.purchaseDate.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        if (!itemsByMonthMap[monthKey]) {
          itemsByMonthMap[monthKey] = [];
        }
        itemsByMonthMap[monthKey].push(item);
      });

      // Ordenar meses
      const sortedMonths = Object.keys(itemsByMonthMap).sort();
      
      sortedMonths.forEach(monthKey => {
        const monthItems = itemsByMonthMap[monthKey];
        const [yearStr, monthStr] = monthKey.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthLabelItem = `${monthNames[month - 1]} de ${year}`;
        
        message += `📅 *${monthLabelItem}*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        let monthTotal = 0;
        
        monthItems.forEach(item => {
          const installmentAmount = item.type === 'installment' ? item.amount / (item.installments || 1) : item.amount;
          monthTotal += item.type === 'cash' ? item.amount : installmentAmount;
          
          // Para parceladas, mostrar apenas o valor da parcela
          const displayAmount = item.type === 'installment' ? installmentAmount : item.amount;
          
          message += `🛍️ *${item.name}*\n`;
          message += `   💰 R$ ${displayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
          
          if (item.type === 'installment') {
            message += `   (${item.installments}x)\n`;
          }
          
          message += `\n`;
        });
        
        message += `💰 *Total do mês: R$ ${monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
      });
      
      // Calcular total geral
      const totalGeral = itemsToShare.reduce((sum, item) => {
        if (item.type === 'cash') {
          return sum + item.amount;
        } else {
          return sum + (item.amount / (item.installments || 1));
        }
      }, 0);
      
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `💵 *TOTAL GERAL: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n\n`;
    }
    
    message += `📱 Criado com Kako Fin\n`;
    message += `https://kako-fin.vercel.app/`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">Lista de Compras</h3>
        <div className="flex gap-3">
          {shoppingItems.length > 0 && (
            <>
              {deleteSelectionMode ? (
                <>
                  <button
                    onClick={() => {
                      if (itemsToDelete.size > 0) {
                        setShowDeleteBulkModal(true);
                      } else {
                        showToast('Selecione pelo menos um item para excluir.', 'warning');
                      }
                    }}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-100"
                    disabled={itemsToDelete.size === 0}
                  >
                    <Trash2 size={20} />
                    Excluir Selecionados ({itemsToDelete.size})
                  </button>
                  <button
                    onClick={() => {
                      setDeleteSelectionMode(false);
                      setItemsToDelete(new Set());
                    }}
                    className="flex items-center gap-2 bg-slate-600 text-white px-6 py-2.5 rounded-xl hover:bg-slate-700 transition-all font-semibold"
                  >
                    Cancelar Seleção
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setDeleteSelectionMode(true)}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 transition-all font-semibold shadow-lg shadow-red-100"
                  >
                    <Trash2 size={20} />
                    Excluir em Lote
                  </button>
                  <button 
                    onClick={handleShareShoppingList}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-xl hover:bg-green-700 transition-all font-semibold shadow-lg shadow-green-100"
                  >
                    <Share2 size={20} />
                    Compartilhar
                  </button>
                </>
              )}
            </>
          )}
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-100"
          >
            <Plus size={20} />
            Nova Compra
          </button>
        </div>
      </div>

      {itemsByMonth.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center text-slate-400">
          <ShoppingCart size={48} className="mb-4 opacity-20" />
          <p className="font-medium">Nenhuma compra cadastrada ainda.</p>
          <p className="text-sm">Comece a planejar suas compras!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {itemsByMonth.map(([monthLabel, items]) => {
            const monthTotal = getMonthTotal(items);
            const isCurrentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) === monthLabel;
            const isFutureMonth = new Date(items[0].purchaseDate) > new Date();

            return (
              <div key={monthLabel} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative group">
                <div className={`p-4 border-b relative ${isCurrentMonth ? 'bg-indigo-50 border-indigo-200' : isFutureMonth ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <button 
                    onClick={() => handleShareShoppingList(items, monthLabel)}
                    className="absolute top-3 right-3 text-green-600 hover:text-green-700 opacity-90 group-hover:opacity-100 transition-all p-2 bg-white hover:bg-green-50 rounded-lg shadow-md border border-green-200 z-10"
                    title="Compartilhar via WhatsApp"
                  >
                    <Share2 size={18} />
                  </button>
                  <div className="flex items-center justify-between mb-3 pr-14">
                    <div className="flex items-center gap-3">
                      <Calendar className={isCurrentMonth ? 'text-indigo-600' : isFutureMonth ? 'text-green-600' : 'text-slate-600'} size={20} />
                      <h4 className="text-lg font-bold text-slate-800 capitalize">{monthLabel}</h4>
                      {isCurrentMonth && (
                        <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full uppercase">
                          Mês Atual
                        </span>
                      )}
                      {isFutureMonth && (
                        <span className="text-xs font-bold bg-green-600 text-white px-2 py-1 rounded-full uppercase">
                          Futuro
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-medium">Total Previsto</p>
                      <p className="text-lg font-bold text-slate-800">
                        R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenCopyModal(items)}
                      className="flex-1 text-xs font-bold py-2 px-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy size={14} />
                      Copiar Mês
                    </button>
                    <button
                      onClick={() => handleAddMonthToTransactions(items, monthLabel)}
                      className="flex-1 text-xs font-bold py-2 px-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Package size={14} />
                      Adicionar Transações
                    </button>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(item => {
                    const installmentAmount = item.type === 'installment' ? item.amount / (item.installments || 1) : item.amount;
                    const isSelectedForDelete = itemsToDelete.has(item.id);
                    
                    return (
                      <div key={item.id} className={`bg-slate-50 rounded-2xl p-4 border relative group transition-all ${
                        isSelectedForDelete ? 'border-red-400 bg-red-50' : 'border-slate-200'
                      }`}>
                        {!deleteSelectionMode && (
                          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setItemToDelete(item.id);
                                setShowDeleteModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}

                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 rounded-xl ${
                            item.type === 'cash' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {item.type === 'cash' ? <DollarSign size={20} /> : <CreditCard size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="font-bold text-slate-800 mb-1 truncate">{item.name}</h5>
                              {deleteSelectionMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelectedForDelete}
                                  onChange={() => {
                                    setItemsToDelete(prev => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(item.id)) {
                                        newSet.delete(item.id);
                                      } else {
                                        newSet.add(item.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500 flex-shrink-0"
                                />
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{item.category}</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Valor Total:</span>
                            <span className="font-bold text-slate-800">
                              R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {item.type === 'installment' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Parcela ({item.installments}x):</span>
                              <span className="font-bold text-blue-600">
                                R$ {installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Data:</span>
                            <span>{formatDateForDisplay(item.purchaseDate)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Copiar Mês */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Copiar Itens para Outro Mês</h3>
              <p className="text-sm text-slate-500 mt-1">
                Selecione os itens que deseja copiar
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Seleção de itens */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Itens para Copiar</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllItems}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-700"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={deselectAllItems}
                      className="text-xs text-slate-500 font-semibold hover:text-slate-700"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {copySourceItems.map(item => {
                    const isSelected = selectedItems.has(item.id);
                    const installmentAmount = item.type === 'installment' ? item.amount / (item.installments || 1) : item.amount;
                    
                    return (
                      <label
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected ? 'bg-indigo-50 border-2 border-indigo-300' : 'bg-white border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{item.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              item.type === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.type === 'cash' ? 'À Vista' : `${item.installments}x`}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <p>Categoria: {item.category}</p>
                            <p>Valor: R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            {item.type === 'installment' && (
                              <p>Parcela: R$ {installmentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {selectedItems.size} de {copySourceItems.length} item(ns) selecionado(s)
                </p>
              </div>

              {/* Seleção de mês e ano */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mês de Destino</label>
                  <select
                    value={copyTargetMonth}
                    onChange={(e) => setCopyTargetMonth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione</option>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2024, i, 1).toLocaleDateString('pt-BR', { month: 'long' });
                      return (
                        <option key={month} value={month}>
                          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ano de Destino</label>
                  <select
                    value={copyTargetYear}
                    onChange={(e) => setCopyTargetYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecione</option>
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700 font-semibold mb-1">Informação:</p>
                <p className="text-xs text-blue-600">
                  Os itens selecionados serão copiados com a data ajustada para o primeiro dia do mês selecionado. 
                  Compras parceladas manterão o mesmo número de parcelas.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCopyModal(false);
                  setCopySourceItems([]);
                  setSelectedItems(new Set());
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCopyItems}
                disabled={selectedItems.size === 0 || !copyTargetMonth || !copyTargetYear}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copiar ({selectedItems.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova/Editar Compra */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">
                {editingItem ? 'Editar Compra' : 'Nova Compra'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Item</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: Notebook, Geladeira..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Compra</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setType('cash')}
                    className={`py-2.5 text-sm font-bold rounded-lg transition-all ${
                      type === 'cash' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <DollarSign size={16} className="inline mr-1" />
                    À Vista
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('installment')}
                    className={`py-2.5 text-sm font-bold rounded-lg transition-all ${
                      type === 'installment' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <CreditCard size={16} className="inline mr-1" />
                    Parcelada
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Total (R$)</label>
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
                {type === 'installment' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parcelas</label>
                    <input 
                      type="number" 
                      min="2"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                      placeholder="2"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Compra</label>
                <input 
                  type="date" 
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
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

              {type === 'installment' && amount && installments && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs text-blue-700 font-semibold mb-1">Valor por Parcela:</p>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {(parseFloat(amount) / parseInt(installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {installments} parcela(s) de R$ {(parseFloat(amount) / parseInt(installments)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}

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
                  {editingItem ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão Individual */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-red-600">Confirmar Exclusão</h3>
              <p className="text-sm text-slate-500 mt-1">
                Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6">
              {(() => {
                const item = shoppingItems.find(i => i.id === itemToDelete);
                if (!item) return null;
                return (
                  <div className="bg-slate-50 rounded-xl p-4 mb-4">
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-sm text-slate-600">Categoria: {item.category}</p>
                    <p className="text-sm text-slate-600">Valor: R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                );
              })()}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (itemToDelete) {
                    try {
                      await onDelete(itemToDelete);
                      setShowDeleteModal(false);
                      setItemToDelete(null);
                      // O toast já é mostrado na função onDelete
                    } catch (error) {
                      console.error('Erro ao excluir item:', error);
                      showToast('Erro ao excluir item. Tente novamente.', 'error');
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
                Tem certeza que deseja excluir {itemsToDelete.size} item(ns) selecionado(s)? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-6 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {Array.from(itemsToDelete).map(id => {
                  const item = shoppingItems.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="bg-slate-50 rounded-xl p-3">
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-600">{item.category}</p>
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
                  const idsToDelete = Array.from(itemsToDelete);
                  for (const id of idsToDelete) {
                    await onDelete(id);
                  }
                  setShowDeleteBulkModal(false);
                  setDeleteSelectionMode(false);
                  setItemsToDelete(new Set());
                  showToast(`${idsToDelete.length} item(ns) excluído(s) com sucesso!`, 'success');
                }}
                className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl"
              >
                Confirmar Exclusão ({itemsToDelete.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shopping;

