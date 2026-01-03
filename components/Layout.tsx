import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  BarChart3,
  User,
  LogOut,
  Wallet,
  Heart,
  X,
  Copy,
  Settings,
  ShoppingCart,
  Bell,
} from "lucide-react";
import { UserProfile } from "../types";
import { db } from "../services/db";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: UserProfile;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onLogout,
  user,
}) => {
  const [showSupportBanner, setShowSupportBanner] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const APP_VERSION = "1.0.0"; // Versão do app
  const lastLoadTimeRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);

  // Verificar se é admin baseado no role
  const isAdmin = user?.role === "admin";

  // Carregar contagem de notificações não lidas
  const loadUnreadCount = useCallback(async () => {
    if (!user?.email) return;

    // Evitar chamadas simultâneas
    if (isLoadingRef.current) {
      return;
    }

    // Evitar chamadas muito frequentes (mínimo 5 minutos entre chamadas automáticas)
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    if (timeSinceLastLoad > 0 && timeSinceLastLoad < 300000) {
      return;
    }

    isLoadingRef.current = true;
    lastLoadTimeRef.current = now;

    try {
      const notifications = await db.getNotifications(user.email);
      const unread = notifications.filter(n => !n.isRead).length;
      setUnreadNotifications(unread);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user?.email]);

  useEffect(() => {
    if (user?.email) {
      // Carregar imediatamente apenas quando o email do usuário mudar
      loadUnreadCount();
      
      // Atualizar a cada 1 hora (3600000ms)
      const interval = setInterval(loadUnreadCount, 3600000);
      return () => clearInterval(interval);
    }
  }, [loadUnreadCount]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "transactions", label: "Transações", icon: Wallet },
    { id: "shopping", label: "Compras", icon: ShoppingCart },
    { id: "goals", label: "Metas", icon: Target },
    { id: "reports", label: "Relatórios", icon: BarChart3 },
    { id: "notifications", label: "Informações", icon: Bell, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
    { id: "profile", label: "Perfil", icon: User },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Settings }] : []),
  ];

  // Verificar a cada minuto se deve mostrar o banner
  React.useEffect(() => {
    const checkBanner = () => {
      if (!user?.lastContributionDate) {
        setShowSupportBanner(true);
        return;
      }

      const lastContribution = new Date(user.lastContributionDate);
      const now = new Date();
      const daysSinceContribution = Math.floor(
        (now.getTime() - lastContribution.getTime()) / (1000 * 60 * 60 * 24)
      );

      setShowSupportBanner(daysSinceContribution >= 30);
    };

    checkBanner(); // Verificar imediatamente

    const interval = setInterval(checkBanner, 120000); // Verificar a cada 2 minutos

    return () => clearInterval(interval);
  }, [user?.lastContributionDate]);

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText("61992459777");
      alert("PIX copiado! Chave: 61992459777");
    } catch (err) {
      alert("Chave PIX: 61992459777\n(Copie manualmente)");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <Wallet className="w-8 h-8 text-indigo-400" />
          <h1 className="text-xl font-bold tracking-tight">Kako Fin</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? "bg-indigo-700 text-white shadow-lg"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && item.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-indigo-300 hover:text-white hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Support Banner - Desktop Only */}
        {showSupportBanner && (
          <div className="hidden md:block bg-gradient-to-r from-indigo-600 to-violet-700 text-white px-8 py-3 border-b border-indigo-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart size={18} className="text-pink-300" />
                <p className="text-sm">
                  <span className="font-semibold">
                    Ajude a manter o Kako Fin no ar!
                  </span>{" "}
                  Sua contribuição é de suma importância para a manutenção do
                  app. PIX:{" "}
                  <span
                    className="font-bold bg-white/20 px-2 py-0.5 rounded cursor-pointer hover:bg-white/30 transition-all"
                    onClick={handleCopyPix}
                  >
                    61992459777
                  </span>
                  <span className="text-xs ml-2 opacity-90">
                    (Não é obrigatório, mas ajuda muito!)
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowSupportBanner(false)}
                className="text-white/80 hover:text-white transition-colors p-1"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {menuItems.find((i) => i.id === activeTab)?.label}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              v{APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs text-slate-400">Olá,</span>
              <span className="text-sm font-semibold text-indigo-600">
                {user.name}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={() => setActiveTab("profile")}
                className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200 overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </button>
              <span className="text-xs text-slate-500 font-medium sm:hidden">
                {user.name}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>

        {/* Footer */}
        <footer className="hidden md:block bg-white border-t border-slate-200 px-8 py-4">
          <div className="flex items-center justify-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Kako Solutions. Todos os direitos
              reservados.
            </p>
          </div>
        </footer>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 overflow-x-auto">
          <div className="flex flex-nowrap px-2 py-2 min-w-max">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`min-w-[70px] p-2 rounded-lg flex flex-col items-center gap-1 flex-shrink-0 relative ${
                  activeTab === item.id ? "text-indigo-600" : "text-slate-400"
                }`}
              >
                <div className="relative">
                  <item.icon size={20} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase font-bold whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
};

export default Layout;
