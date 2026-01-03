
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Goals from './components/Goals';
import Reports from './components/Reports';
import Profile from './components/Profile';
import Admin from './components/Admin';
import Shopping from './components/Shopping';
import { ToastContainer, useToast } from './components/Toast';
import { db } from './services/db';
import { AuthState, Transaction, Goal, UserProfile, Category, ShoppingItem } from './types';
import { Wallet, LogIn, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';

const App: React.FC = () => {
  const { toasts, showToast, removeToast } = useToast();
  
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('fintrack_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('fintrack_activeTab');
    return saved || 'dashboard';
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // App Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  
  // Flag para evitar salvamento durante carregamento inicial
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Sincronização Inicial com o "Banco de Dados"
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      loadUserData(auth.user.email);
    } else {
      // Resetar flag quando deslogar
      setHasLoadedData(false);
      setTransactions([]);
      setGoals([]);
      setShoppingItems([]);
    }
  }, [auth.isAuthenticated]);

  // Loop de verificação de contribuições a cada 2 minutos
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;

    const checkUserContribution = async () => {
      try {
        // Recarregar perfil do banco para verificar atualizações
        const currentEmail = auth.user!.email;
        const updatedProfile = await db.getProfile(currentEmail);
        if (updatedProfile) {
          const currentDate = auth.user.lastContributionDate || '';
          const updatedDate = updatedProfile.lastContributionDate || '';
          
          if (updatedDate !== currentDate) {
            // Atualizar perfil se houver mudança na data de contribuição
            setAuth(prev => ({
              ...prev,
              user: updatedProfile
            }));
            console.log('✅ Contribuição atualizada para:', currentEmail);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar contribuição:', error);
      }
    };

    checkUserContribution(); // Verificar imediatamente
    const interval = setInterval(checkUserContribution, 120000); // A cada 2 minutos

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.user?.email, auth.user?.lastContributionDate]);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    setIsLoadingData(true);
    try {
      const [tData, gData, sData] = await Promise.all([
        db.getData<Transaction>('transactions', userId),
        db.getData<Goal>('goals', userId),
        db.getData<ShoppingItem>('shopping', userId)
      ]);
      
      // Remover duplicatas baseado em ID antes de definir o estado
      const uniqueTransactions = Array.from(
        new Map(tData.map(t => [t.id, t])).values()
      );
      const uniqueGoals = Array.from(
        new Map(gData.map(g => [g.id, g])).values()
      );
      const uniqueShoppingItems = Array.from(
        new Map(sData.map(s => [s.id, s])).values()
      );
      
      if (uniqueTransactions.length !== tData.length) {
        console.warn(`⚠️ Removidas ${tData.length - uniqueTransactions.length} transações duplicadas`);
      }
      if (uniqueGoals.length !== gData.length) {
        console.warn(`⚠️ Removidas ${gData.length - uniqueGoals.length} metas duplicadas`);
      }
      if (uniqueShoppingItems.length !== sData.length) {
        console.warn(`⚠️ Removidos ${sData.length - uniqueShoppingItems.length} itens de compra duplicados`);
      }
      
      setTransactions(uniqueTransactions);
      setGoals(uniqueGoals);
      setShoppingItems(uniqueShoppingItems);
      setHasLoadedData(true);
    } finally {
      setIsLoading(false);
      // Aguardar um pouco antes de permitir salvamento para evitar race conditions
      setTimeout(() => {
        setIsLoadingData(false);
      }, 500);
    }
  };

  // Persistência Automática (Auto-Sync) - APENAS após carregar dados iniciais
  useEffect(() => {
    if (auth.isAuthenticated && auth.user && hasLoadedData && !isLoadingData && transactions.length >= 0) {
      // Remover duplicatas antes de salvar
      const uniqueTransactions = Array.from(
        new Map(transactions.map(t => [t.id, t])).values()
      );
      
      if (uniqueTransactions.length !== transactions.length) {
        console.warn(`⚠️ Removendo ${transactions.length - uniqueTransactions.length} transações duplicadas antes de salvar`);
        setTransactions(uniqueTransactions);
        return; // Retornar para evitar salvar com duplicatas
      }
      
      db.saveData('transactions', auth.user.email, transactions);
    }
  }, [transactions, auth.isAuthenticated, hasLoadedData, isLoadingData]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user && hasLoadedData && !isLoadingData && goals.length >= 0) {
      db.saveData('goals', auth.user.email, goals);
    }
  }, [goals, auth.isAuthenticated, hasLoadedData, isLoadingData]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user && hasLoadedData && !isLoadingData && shoppingItems.length >= 0) {
      db.saveData('shopping', auth.user.email, shoppingItems);
    }
  }, [shoppingItems, auth.isAuthenticated, hasLoadedData, isLoadingData]);

  useEffect(() => {
    localStorage.setItem('fintrack_auth', JSON.stringify(auth));
  }, [auth]);

  // Persistir activeTab no localStorage
  useEffect(() => {
    localStorage.setItem('fintrack_activeTab', activeTab);
  }, [activeTab]);

  // Auth Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get('email') as string;
    const pass = formData.get('password') as string;
    
    // Buscar perfil e senha do usuário
    const profile = await db.getProfile(email);
    const savedPassword = await db.getPassword(email);
    
    // Se não existe senha salva, pode ser um usuário novo ou senha padrão antiga
    if (!savedPassword) {
      // Verificar se existe perfil mas sem senha (migração de usuários antigos)
      if (profile) {
        alert('Usuário encontrado, mas sem senha cadastrada. Por favor, faça o cadastro novamente ou use a senha padrão: 123456');
        // Permitir login com senha padrão para migração
        if (pass === '123456') {
          await db.savePassword(email, pass);
          setAuth({
            isAuthenticated: true,
            user: profile
          });
        } else {
          alert('Senha incorreta!');
        }
      } else {
        alert('Usuário não encontrado. Por favor, faça o cadastro primeiro.');
      }
    } else if (pass === savedPassword) {
      setAuth({
        isAuthenticated: true,
        user: profile || { name: 'Usuário', email, currency: 'BRL', role: 'user' }
      });
    } else {
      alert('Senha incorreta!');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const pass = formData.get('password') as string;
    
    // Verificar se usuário já existe
    const existingProfile = await db.getProfile(email);
    if (existingProfile) {
      alert('Este e-mail já está cadastrado. Por favor, faça login.');
      setIsLoading(false);
      return;
    }
    
    const newUser: UserProfile = { name, email, currency: 'BRL', role: 'user' };
    await db.saveProfile(newUser);
    await db.savePassword(email, pass);
    setAuth({ isAuthenticated: true, user: newUser });
    setIsLoading(false);
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
    setTransactions([]);
    setGoals([]);
  };

  // CRUD Handlers
  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    // Verificar se já existe uma transação idêntica (mesma descrição, data, valor e tipo)
    const isDuplicate = transactions.some(existing => 
      existing.description === t.description &&
      existing.date === t.date &&
      existing.amount === t.amount &&
      existing.type === t.type
    );
    
    if (isDuplicate) {
      console.warn('⚠️ Tentativa de adicionar transação duplicada ignorada:', t.description, t.date);
      return;
    }
    
    // Gerar ID único
    let newId: string;
    const existingIds = new Set(transactions.map(tr => tr.id));
    do {
      newId = Math.random().toString(36).substr(2, 9);
    } while (existingIds.has(newId));
    
    const newT = { ...t, id: newId };
    setTransactions([newT, ...transactions]);
  };

  const updateTransaction = (id: string, updated: Omit<Transaction, 'id'>) => {
    setTransactions(transactions.map(t => t.id === id ? { ...updated, id } : t));
  };

  const deleteTransaction = async (id: string) => {
    if (!auth.user) return;
    
    // Salvar o estado anterior para possível reversão
    const previousTransactions = transactions;
    
    // Remover do estado local primeiro (otimista)
    setTransactions(prevTransactions => {
      return prevTransactions.filter(t => t.id !== id);
    });
    
    // Deletar diretamente do banco
    try {
      await db.deleteTransaction(auth.user.email, id);
      console.log('✅ Transação excluída e persistida no banco');
      showToast('Transação excluída com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao excluir transação do banco:', error);
      // Reverter a mudança no estado se houver erro
      setTransactions(previousTransactions);
      showToast('Erro ao excluir transação. Tente novamente.', 'error');
    }
  };

  const deleteTransactionsByMonth = async (month: number, year: number) => {
    if (!auth.user) return;
    
    // Salvar o estado anterior para possível reversão
    const previousTransactions = transactions;
    
    // Remover do estado local primeiro (otimista)
    setTransactions(prevTransactions => {
      return prevTransactions.filter(t => {
        const [tYearStr, tMonthStr] = t.date.split('-');
        const tYear = parseInt(tYearStr);
        const tMonth = parseInt(tMonthStr); // 1-12
        return !(tMonth === month && tYear === year);
      });
    });
    
    // Remover do banco
    try {
      await db.deleteTransactionsByMonth(auth.user.email, month, year);
      console.log('✅ Transações do mês excluídas e persistidas no banco');
    } catch (error) {
      console.error('❌ Erro ao excluir transações do mês do banco:', error);
      // Reverter a mudança no estado se houver erro
      setTransactions(previousTransactions);
      showToast('Erro ao excluir transações do mês. Tente novamente.', 'error');
      throw error; // Re-throw para que o componente possa tratar
    }
  };

  const addGoal = (g: Omit<Goal, 'id'>) => {
    const newG = { ...g, id: Math.random().toString(36).substr(2, 9) };
    setGoals([...goals, newG]);
  };

  const updateGoal = (id: string, updated: Omit<Goal, 'id'>) => {
    setGoals(goals.map(g => g.id === id ? { ...updated, id } : g));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const updateGoalProgress = (id: string, amount: number) => {
    setGoals(goals.map(g => g.id === id ? { ...g, currentAmount: g.currentAmount + amount } : g));
  };

  // Shopping Handlers
  const addShoppingItem = (item: Omit<ShoppingItem, 'id'>) => {
    const newItem = { ...item, id: Math.random().toString(36).substr(2, 9) };
    setShoppingItems(prev => [...prev, newItem]);
  };

  const updateShoppingItem = (id: string, updated: Omit<ShoppingItem, 'id'>) => {
    setShoppingItems(shoppingItems.map(item => item.id === id ? { ...updated, id } : item));
  };

  const deleteShoppingItem = async (id: string) => {
    if (!auth.user) return;
    
    // Salvar o estado anterior para possível reversão
    const previousItems = shoppingItems;
    
    // Remover do estado local primeiro
    const updatedItems = shoppingItems.filter(item => item.id !== id);
    setShoppingItems(updatedItems);
    
    // Persistir no banco imediatamente
    try {
      await db.saveData('shopping', auth.user.email, updatedItems);
      console.log('✅ Item excluído e persistido no banco');
      showToast('Item excluído com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao excluir item do banco:', error);
      // Reverter a mudança no estado se houver erro
      setShoppingItems(previousItems);
      showToast('Erro ao excluir item. Tente novamente.', 'error');
    }
  };


  const addShoppingToTransactions = async (newTransactions: Array<{ description: string; amount: number; date: string; category: string; type: 'expense' }>, month?: number, year?: number, itemNamesToUpdate?: Set<string>) => {
    if (!auth.user) return;
    
    setIsLoading(true);
    
    try {
      // Se mês e ano foram especificados, remover transações do banco ANTES de atualizar o estado
      if (month !== undefined && year !== undefined) {
        console.log('🗑️ Removendo transações de gastos do banco para o mês:', month, 'ano:', year);
        
        // Remover do banco: remover apenas as transações relacionadas aos itens que estão sendo adicionados
        // Parcelas de compras parceladas de outros itens serão preservadas (como receitas)
        await db.deleteTransactionsByMonth(auth.user.email, month, year, 'expense', itemNamesToUpdate);
        
        // Recarregar transações do banco para garantir sincronização
        console.log('🔄 Recarregando transações do banco após remoção...');
        const updatedTransactions = await db.getData<Transaction>('transactions', auth.user.email);
        
        // Remover duplicatas por ID ao recarregar
        const uniqueUpdatedTransactions = Array.from(
          new Map(updatedTransactions.map(t => [t.id, t])).values()
        );
        
        console.log(`✅ ${uniqueUpdatedTransactions.length} transações carregadas do banco`);
        
        // Agora adicionar as novas transações ao estado atualizado
        setTransactions(prevTransactions => {
          // Usar as transações recarregadas do banco como base
          let filteredTransactions = uniqueUpdatedTransactions;
          
          // Criar um Set com IDs existentes para verificar duplicatas
          const existingIds = new Set(filteredTransactions.map(t => t.id));
          
          // Adicionar novas transações, evitando duplicatas por descrição, data e valor
          const transactionsToAdd: Transaction[] = [];
          const seenKeys = new Set<string>();
          
          newTransactions.forEach(t => {
            // Criar uma chave única baseada em descrição, data, valor e tipo para evitar duplicatas
            const uniqueKey = `${t.description}|${t.date}|${t.amount}|${t.type}`;
            
            // Verificar se já existe uma transação idêntica nas transações recarregadas
            const alreadyExists = filteredTransactions.some(existing => 
              existing.description === t.description &&
              existing.date === t.date &&
              existing.amount === t.amount &&
              existing.type === t.type
            );
            
            if (!seenKeys.has(uniqueKey) && !alreadyExists) {
              seenKeys.add(uniqueKey);
              
              // Gerar ID único
              let newId: string;
              do {
                newId = Math.random().toString(36).substr(2, 9);
              } while (existingIds.has(newId));
              
              existingIds.add(newId);
              
              transactionsToAdd.push({
                ...t,
                id: newId
              });
            } else {
              console.warn('⚠️ Transação duplicada ignorada:', t.description, t.date);
            }
          });
          
          console.log('Adicionando novas transações:', transactionsToAdd.length);
          console.log('Total de transações após adição:', transactionsToAdd.length + filteredTransactions.length);
          
          // Remover duplicatas finais baseadas em ID antes de retornar
          const allTransactions = [...transactionsToAdd, ...filteredTransactions];
          const uniqueTransactions = Array.from(
            new Map(allTransactions.map(t => [t.id, t])).values()
          );
          
          // Também remover duplicatas por chave única (descrição|data|valor|tipo)
          const finalTransactions: Transaction[] = [];
          const finalSeenKeys = new Set<string>();
          
          uniqueTransactions.forEach(t => {
            const uniqueKey = `${t.description}|${t.date}|${t.amount}|${t.type}`;
            if (!finalSeenKeys.has(uniqueKey)) {
              finalSeenKeys.add(uniqueKey);
              finalTransactions.push(t);
            } else {
              console.warn('⚠️ Removendo duplicata final:', t.description, t.date);
            }
          });
          
          if (finalTransactions.length !== uniqueTransactions.length) {
            console.warn(`⚠️ Removidas ${uniqueTransactions.length - finalTransactions.length} duplicatas finais por chave única`);
          }
          
          return finalTransactions;
        });
      } else {
        // Se não especificou mês/ano, apenas adicionar sem remover
        setTransactions(prevTransactions => {
          const existingIds = new Set(prevTransactions.map(t => t.id));
          const transactionsToAdd: Transaction[] = [];
          const seenKeys = new Set<string>();
          
          newTransactions.forEach(t => {
            const uniqueKey = `${t.description}|${t.date}|${t.amount}|${t.type}`;
            
            const alreadyExists = prevTransactions.some(existing => 
              existing.description === t.description &&
              existing.date === t.date &&
              existing.amount === t.amount &&
              existing.type === t.type
            );
            
            if (!seenKeys.has(uniqueKey) && !alreadyExists) {
              seenKeys.add(uniqueKey);
              
              let newId: string;
              do {
                newId = Math.random().toString(36).substr(2, 9);
              } while (existingIds.has(newId));
              
              existingIds.add(newId);
              transactionsToAdd.push({ ...t, id: newId });
            }
          });
          
          return [...transactionsToAdd, ...prevTransactions];
        });
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar transações:', error);
      showToast('Erro ao adicionar transações. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updated: UserProfile) => {
    setIsLoading(true);
    await db.saveProfile(updated);
    setAuth(prev => ({ ...prev, user: updated }));
    setIsLoading(false);
  };


  const changePassword = async (oldP: string, newP: string): Promise<boolean> => {
    if (!auth.user) return false;
    
    const savedPassword = await db.getPassword(auth.user.email);
    if (savedPassword && oldP === savedPassword) {
      await db.savePassword(auth.user.email, newP);
      return true;
    }
    return false;
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
              <Wallet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Kako Fin</h1>
            <p className="text-slate-500 text-sm">Controle sua vida financeira</p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                <input name="name" type="text" required className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
              <input name="email" type="email" required className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha</label>
              <div className="relative">
                <input 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button disabled={isLoading} type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="animate-spin" /> : (isRegistering ? 'Cadastrar' : 'Entrar')}
            </button>
          </form>

          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-6 text-sm font-semibold text-indigo-600 text-center">
            {isRegistering ? 'Já tem conta? Login' : 'Novo por aqui? Criar conta'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={auth.user!}>
        <div className="relative">
        {isLoading && (
          <div className="absolute top-0 right-0 p-2 z-50 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Sincronizando com a nuvem...
          </div>
        )}
        {activeTab === 'dashboard' && <Dashboard transactions={transactions} goals={goals} user={auth.user} />}
        {activeTab === 'transactions' && <Transactions transactions={transactions} onAdd={addTransaction} onUpdate={updateTransaction} onDelete={deleteTransaction} onDeleteByMonth={deleteTransactionsByMonth} showToast={showToast} />}
        {activeTab === 'shopping' && <Shopping shoppingItems={shoppingItems} onAdd={addShoppingItem} onUpdate={updateShoppingItem} onDelete={deleteShoppingItem} onAddToTransactions={addShoppingToTransactions} showToast={showToast} />}
        {activeTab === 'goals' && <Goals goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={deleteGoal} onUpdateProgress={updateGoalProgress} />}
        {activeTab === 'reports' && <Reports transactions={transactions} goals={goals} />}
        {activeTab === 'profile' && <Profile user={auth.user!} onUpdate={updateUserProfile} onChangePassword={changePassword} onLogout={handleLogout} />}
        {activeTab === 'admin' && auth.user && auth.user.role === 'admin' && <Admin userEmail={auth.user.email} />}
        </div>
      </Layout>
    </>
  );
};

export default App;
