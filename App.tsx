
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Goals from './components/Goals';
import Reports from './components/Reports';
import Profile from './components/Profile';
import Admin from './components/Admin';
import Shopping from './components/Shopping';
import Notifications from './components/Notifications';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Pricing from './components/Pricing';
import Budgets from './components/Budgets';
import Installments from './components/Installments';
import { ToastContainer, useToast } from './components/Toast';
import { db } from './services/db';
import { generateTemporaryPassword } from './services/passwordService';
import { sendPasswordRecoveryEmail } from './services/emailService';
import { startAutoCleanupScheduler } from './services/notificationCleanup';
import {
  AuthState,
  Transaction,
  Goal,
  UserProfile,
  Category,
  ShoppingItem,
  ShoppingTrip,
  ShoppingLine,
  CategoryBudget,
  InstallmentPlan,
} from './types';
import { Wallet, LogIn, UserPlus, Loader2, Eye, EyeOff, Mail, X } from 'lucide-react';

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
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'basic' | 'premium' | 'premium_plus' | null>(null);
  const [showPricingBeforeAuth, setShowPricingBeforeAuth] = useState(false);
  
  // App Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [shoppingTrips, setShoppingTrips] = useState<ShoppingTrip[]>([]);
  const [shoppingLines, setShoppingLines] = useState<ShoppingLine[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  
  // Flag para evitar salvamento durante carregamento inicial
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Verificar parâmetro de plano na URL ao montar
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam && ['trial', 'basic', 'premium', 'premium_plus'].includes(planParam)) {
      setSelectedPlan(planParam as 'trial' | 'basic' | 'premium' | 'premium_plus');
      setIsRegistering(true);
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Listener para mudança de tab via evento customizado
  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('change-tab', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('change-tab', handleTabChange as EventListener);
    };
  }, []);

  // Sincronização Inicial com o "Banco de Dados"
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      loadUserData(auth.user.email);
    } else {
      // Resetar flag quando deslogar
      setHasLoadedData(false);
      setTransactions([]);
      setGoals([]);
      setShoppingTrips([]);
      setShoppingLines([]);
      setBudgets([]);
      setInstallments([]);
    }
  }, [auth.isAuthenticated]);

  // Iniciar scheduler de limpeza automática de notificações aos domingos
  useEffect(() => {
    const stopScheduler = startAutoCleanupScheduler();
    return () => {
      stopScheduler();
    };
  }, []);

  // Recarregar perfil do banco (plano, contribuição, role) — evita ficar preso no localStorage
  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;

    const syncProfileFromDb = async () => {
      try {
        const currentEmail = auth.user!.email;
        const updatedProfile = await db.getProfile(currentEmail);
        if (!updatedProfile) return;

        const prev = auth.user!;
        const changed =
          (updatedProfile.lastContributionDate || '') !== (prev.lastContributionDate || '') ||
          (updatedProfile.subscriptionPlan || 'trial') !== (prev.subscriptionPlan || 'trial') ||
          (updatedProfile.subscriptionExpiresAt || '') !== (prev.subscriptionExpiresAt || '') ||
          (updatedProfile.isTrialActive ?? true) !== (prev.isTrialActive ?? true) ||
          (updatedProfile.role || 'user') !== (prev.role || 'user') ||
          updatedProfile.name !== prev.name;

        if (changed) {
          setAuth((current) => ({
            ...current,
            user: updatedProfile,
          }));
          console.log('✅ Perfil sincronizado do banco para:', currentEmail, {
            plan: updatedProfile.subscriptionPlan,
          });
        }
      } catch (error) {
        console.error('Erro ao sincronizar perfil:', error);
      }
    };

    syncProfileFromDb(); // Ao abrir / logar
    const interval = setInterval(syncProfileFromDb, 120000); // A cada 2 minutos

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated, auth.user?.email]);

  const loadUserData = async (userId: string) => {
    setIsLoading(true);
    setIsLoadingData(true);
    try {
      const [tData, gData, legacyShopping, budgetData, installmentData, tripsData, linesData] =
        await Promise.all([
          db.getData<Transaction>('transactions', userId),
          db.getData<Goal>('goals', userId),
          db.getData<ShoppingItem>('shopping', userId),
          db.getBudgets(userId),
          db.getInstallmentPlans(userId),
          db.getShoppingTrips(userId),
          db.getShoppingLines(userId),
        ]);
      
      // Remover duplicatas baseado em ID antes de definir o estado
      const uniqueTransactions = Array.from(
        new Map(tData.map(t => [t.id, t])).values()
      );
      const uniqueGoals = Array.from(
        new Map(gData.map(g => [g.id, g])).values()
      );
      
      if (uniqueTransactions.length !== tData.length) {
        console.warn(`⚠️ Removidas ${tData.length - uniqueTransactions.length} transações duplicadas`);
      }
      if (uniqueGoals.length !== gData.length) {
        console.warn(`⚠️ Removidas ${gData.length - uniqueGoals.length} metas duplicadas`);
      }

      let trips = Array.from(new Map(tripsData.map((t) => [t.id, t])).values());
      let lines = Array.from(new Map(linesData.map((l) => [l.id, l])).values());

      // Migra modelo antigo (1 item = 1 compra) → trip + linha de produto
      if (trips.length === 0 && legacyShopping.length > 0) {
        trips = [];
        lines = [];
        for (const item of legacyShopping) {
          const tripId = item.id;
          trips.push({
            id: tripId,
            name: item.name,
            date: item.purchaseDate,
            category: item.category,
            kind: item.category === Category.ENTERTAINMENT ? 'occasional' : 'market',
            status: 'done',
            syncedToTransactions: false,
          });
          lines.push({
            id: `${tripId}-line`,
            tripId,
            productName: item.name,
            quantity: 1,
            unitPrice: item.amount,
          });
        }
        await db.saveShoppingTrips(userId, trips);
        await db.saveShoppingLines(userId, lines);
        console.log(`✅ Migradas ${legacyShopping.length} compras antigas para carrinhos`);
      }
      
      setTransactions(uniqueTransactions);
      setGoals(uniqueGoals);
      setShoppingTrips(trips);
      setShoppingLines(lines);
      setBudgets(budgetData);
      setInstallments(installmentData);
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
    if (auth.isAuthenticated && auth.user && hasLoadedData && !isLoadingData) {
      db.saveShoppingTrips(auth.user.email, shoppingTrips);
    }
  }, [shoppingTrips, auth.isAuthenticated, hasLoadedData, isLoadingData]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user && hasLoadedData && !isLoadingData) {
      db.saveShoppingLines(auth.user.email, shoppingLines);
    }
  }, [shoppingLines, auth.isAuthenticated, hasLoadedData, isLoadingData]);

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
    
    // Buscar perfil do usuário
    const profile = await db.getProfile(email);
    
    // Verificar senha usando hash
    const isValidPassword = await db.verifyPassword(email, pass);
    
    if (!isValidPassword) {
      // Verificar se existe perfil mas sem senha (migração de usuários antigos)
      if (profile) {
        const savedPassword = await db.getPassword(email);
        if (!savedPassword) {
          // Tentar senha padrão antiga para migração
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
          alert('Senha incorreta!');
        }
      } else {
        alert('Usuário não encontrado. Por favor, faça o cadastro primeiro.');
      }
    } else {
      setAuth({
        isAuthenticated: true,
        user: profile || { name: 'Usuário', email, currency: 'BRL', role: 'user' }
      });
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
    
    // Determinar plano final (padrão é trial)
    const finalPlan = selectedPlan || 'trial';
    const now = new Date().toISOString();
    
    const newUser: UserProfile = { 
      name, 
      email, 
      currency: 'BRL', 
      role: 'user',
      subscriptionPlan: finalPlan,
      subscriptionStartedAt: now,
      subscriptionExpiresAt: null, // Trial é permanente (sem vencimento)
      isTrialActive: finalPlan === 'trial', // Apenas trial é marcado como trial ativo
    };
    await db.saveProfile(newUser);
    await db.savePassword(email, pass);
    setAuth({ isAuthenticated: true, user: newUser });
    setSelectedPlan(null); // Resetar plano selecionado
    setIsLoading(false);
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
    setTransactions([]);
    setGoals([]);
    setShoppingTrips([]);
    setShoppingLines([]);
    setBudgets([]);
    setInstallments([]);
  };

  // CRUD Handlers
  const addTransaction = (t: Omit<Transaction, 'id'>, options?: { allowDuplicate?: boolean }) => {
    const allowDuplicate = options?.allowDuplicate ?? false;
    
    if (!allowDuplicate) {
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
    }
    
    // Gerar ID único
    let newId: string;
    const existingIds = new Set(transactions.map(tr => tr.id));
    do {
      newId = Math.random().toString(36).substr(2, 9);
    } while (existingIds.has(newId));
    
    const newT = { ...t, id: newId };
    // Usar atualização funcional para garantir que múltiplas inserções
    // no mesmo ciclo (como na cópia em lote) acumulem todas as transações
    setTransactions(prev => [newT, ...prev]);
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

  // Shopping Handlers (carrinhos + produtos)
  const saveShoppingTrips = async (next: ShoppingTrip[]) => {
    setShoppingTrips(next);
    if (auth.user?.email) await db.saveShoppingTrips(auth.user.email, next);
  };

  const saveShoppingLines = async (next: ShoppingLine[]) => {
    setShoppingLines(next);
    if (auth.user?.email) await db.saveShoppingLines(auth.user.email, next);
  };

  const updateUserProfile = async (updated: UserProfile) => {
    setIsLoading(true);
    await db.saveProfile(updated);
    setAuth(prev => ({ ...prev, user: updated }));
    setIsLoading(false);
  };

  const updateUserSubscription = async (newPlan: 'trial' | 'basic' | 'premium' | 'premium_plus') => {
    if (!auth.user) return;
    
    setIsLoading(true);
    try {
      const updatedUser: UserProfile = {
        ...auth.user,
        subscriptionPlan: newPlan,
        subscriptionStartedAt: new Date().toISOString(),
        subscriptionExpiresAt: null, // Pode ser atualizado depois com data de expiração
        isTrialActive: newPlan === 'trial' ? true : false,
      };
      
      await db.saveProfile(updatedUser);
      setAuth(prev => ({ ...prev, user: updatedUser }));
      showToast('Plano atualizado com sucesso!', 'success');
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      showToast('Erro ao atualizar plano. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const changePassword = async (oldP: string, newP: string): Promise<boolean> => {
    if (!auth.user) return false;
    
    const isValidPassword = await db.verifyPassword(auth.user.email, oldP);
    if (isValidPassword) {
      await db.savePassword(auth.user.email, newP);
      return true;
    }
    return false;
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setRecoveryMessage('');

    try {
      // Verificar se o email existe
      const profile = await db.getProfile(recoveryEmail);
      if (!profile) {
        setRecoveryMessage('Email não encontrado. Verifique se o email está correto.');
        setRecoveryLoading(false);
        return;
      }

      // Gerar senha provisória
      const temporaryPassword = generateTemporaryPassword();

      // Salvar senha provisória (já com hash)
      await db.recoverPassword(recoveryEmail, temporaryPassword);

      // Enviar email automaticamente
      const result = await sendPasswordRecoveryEmail(
        recoveryEmail,
        temporaryPassword,
        profile.name
      );
      
      if (result.success) {
        setRecoveryMessage(`✅ ${result.message}\n\nPor favor, verifique sua caixa de entrada e também a pasta de spam. A senha provisória expira após o primeiro login, quando você poderá alterá-la.`);
        setRecoveryEmail('');
        setTimeout(() => {
          setShowRecovery(false);
          setRecoveryMessage('');
        }, 8000);
      } else {
        setRecoveryMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      console.error('Erro ao recuperar senha:', error);
      const errorMessage = error?.message || 'Erro ao processar recuperação de senha. Tente novamente.';
      setRecoveryMessage(`❌ ${errorMessage}\n\nVerifique o console do navegador (F12) para mais detalhes.`);
    } finally {
      setRecoveryLoading(false);
    }
  };

  if (!auth.isAuthenticated) {
    // Mostrar pricing antes do cadastro se solicitado
    if (showPricingBeforeAuth) {
      return (
        <Pricing 
          onBack={() => setShowPricingBeforeAuth(false)} 
          onSelectPlan={(plan) => {
            setSelectedPlan(plan);
            setShowPricingBeforeAuth(false);
            setIsRegistering(true);
          }}
          mode="signup"
        />
      );
    }

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
              <>
                {selectedPlan && (
                  <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <p className="text-sm text-teal-800 font-semibold">
                      {selectedPlan === 'trial' 
                        ? '✨ 30 dias grátis selecionado' 
                        : `Plano ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} selecionado`}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                  <input name="name" type="text" required className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </>
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

          {!isRegistering && (
            <button 
              onClick={() => setShowRecovery(true)} 
              className="w-full mt-4 text-sm text-slate-500 hover:text-indigo-600 text-center transition-colors"
            >
              Esqueci minha senha
            </button>
          )}

          <div className="space-y-3 mt-4">
            <button onClick={() => setIsRegistering(!isRegistering)} className="w-full text-sm font-semibold text-indigo-600 text-center">
              {isRegistering ? 'Já tem conta? Login' : 'Novo por aqui? Criar conta'}
            </button>
            {isRegistering && (
              <button 
                type="button"
                onClick={() => setShowPricingBeforeAuth(true)}
                className="w-full text-sm font-semibold text-teal-600 hover:text-teal-700 text-center border border-teal-200 rounded-xl py-2 px-4 hover:bg-teal-50 transition-colors"
              >
                📋 Ver Planos Disponíveis
              </button>
            )}
          </div>
        </div>

        {/* Modal de Recuperação de Senha */}
        {showRecovery && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <Mail className="text-indigo-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Recuperar Senha</h2>
                    <p className="text-sm text-slate-500">Enviaremos uma senha provisória</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRecovery(false);
                    setRecoveryEmail('');
                    setRecoveryMessage('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {recoveryMessage ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl ${recoveryMessage.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className="text-sm whitespace-pre-line">{recoveryMessage}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRecovery(false);
                      setRecoveryEmail('');
                      setRecoveryMessage('');
                    }}
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordRecovery} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      E-mail cadastrado
                    </label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      required
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Enviaremos uma senha provisória para este email
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {recoveryLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Mail size={20} />
                        Enviar Senha Provisória
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <PWAInstallPrompt />
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} user={auth.user!}>
        <div className="relative">
        {isLoading && (
          <div className="absolute top-0 right-0 p-2 z-50 flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Sincronizando com a nuvem...
          </div>
        )}
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            goals={goals}
            user={auth.user}
            auth={auth}
            budgets={budgets}
            installments={installments}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === 'transactions' && (
          <Transactions
            transactions={transactions}
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
            onDeleteByMonth={deleteTransactionsByMonth}
            showToast={showToast}
            userEmail={auth.user?.email}
          />
        )}
        {activeTab === 'budgets' && (
          <Budgets
            budgets={budgets}
            transactions={transactions}
            showToast={showToast}
            onSave={async (next) => {
              setBudgets(next);
              if (auth.user?.email) await db.saveBudgets(auth.user.email, next);
            }}
          />
        )}
        {activeTab === 'bills' && (
          <Installments
            plans={installments}
            showToast={showToast}
            monthIncome={transactions
              .filter((t) => {
                if (t.type !== 'income') return false;
                const [y, m] = t.date.split('-').map(Number);
                const now = new Date();
                return y === now.getFullYear() && m === now.getMonth() + 1;
              })
              .reduce((s, t) => s + t.amount, 0)}
            onSave={async (next) => {
              setInstallments(next);
              if (auth.user?.email) await db.saveInstallmentPlans(auth.user.email, next);
            }}
            onCreateTransaction={(tx) => addTransaction(tx, { allowDuplicate: true })}
          />
        )}
        {activeTab === 'shopping' && (
          <Shopping
            trips={shoppingTrips}
            lines={shoppingLines}
            budgets={budgets}
            onSaveTrips={saveShoppingTrips}
            onSaveLines={saveShoppingLines}
            onCreateTransaction={(tx) => addTransaction(tx, { allowDuplicate: true })}
            showToast={showToast}
          />
        )}
        {activeTab === 'goals' && (
          <Goals goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={deleteGoal} onUpdateProgress={updateGoalProgress} />
        )}
        {activeTab === 'reports' && (
          <Reports
            transactions={transactions}
            goals={goals}
            auth={auth}
            budgets={budgets}
          />
        )}
        {activeTab === 'notifications' && <Notifications userEmail={auth.user!.email} />}
        {activeTab === 'profile' && <Profile user={auth.user!} onUpdate={updateUserProfile} onChangePassword={changePassword} onLogout={handleLogout} auth={auth} />}
        {activeTab === 'admin' && auth.user && auth.user.role === 'admin' && <Admin userEmail={auth.user.email} />}
        {activeTab === 'pricing' && auth.isAuthenticated && (
          <Pricing 
            onBack={() => setActiveTab('dashboard')} 
            onSelectPlan={async (plan) => {
              await updateUserSubscription(plan);
            }}
            mode="change"
            currentPlan={auth.user?.subscriptionPlan}
          />
        )}
        </div>
      </Layout>
    </>
  );
};

export default App;
