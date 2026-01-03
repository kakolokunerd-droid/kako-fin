
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Notification } from '../types';
import { db } from '../services/db';

interface NotificationsProps {
  userEmail: string;
}

const Notifications: React.FC<NotificationsProps> = ({ userEmail }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const lastLoadTimeRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);

  const loadNotifications = useCallback(async () => {
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
    setLoading(true);
    
    try {
      const allNotifications = await db.getNotifications(userEmail);
      // Ordenar por data (mais recentes primeiro)
      const sorted = allNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userEmail]);

  useEffect(() => {
    // Carregar imediatamente apenas quando o email do usuário mudar
    loadNotifications();
    
    // Recarregar notificações a cada 1 hora (3600000ms) para pegar novas
    const interval = setInterval(() => {
      loadNotifications();
    }, 3600000);
    
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await db.markNotificationAsRead(userEmail, notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, isRead: true, readAt: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      for (const id of unreadIds) {
        await db.markNotificationAsRead(userEmail, id);
      }
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await db.deleteNotification(userEmail, notificationId);
      // Remover da lista imediatamente para feedback visual
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      // Mesmo com erro, remover da lista localmente
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400">Carregando notificações...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell size={24} className="text-indigo-600" />
            Informações e Alertas
          </h3>
          {unreadCount > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              {unreadCount} notificação{unreadCount > 1 ? 'ões' : ''} não lida{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
              filter === 'unread'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter === 'all' ? 'Não Lidas' : 'Todas'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-all"
            >
              Marcar Todas como Lidas
            </button>
          )}
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 py-20 flex flex-col items-center justify-center text-slate-400">
          <Bell size={48} className="mb-4 opacity-20" />
          <p className="font-medium">
            {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação encontrada'}
          </p>
          <p className="text-sm">Você está em dia com suas notificações!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all ${
                notification.isRead 
                  ? 'border-slate-200 opacity-75' 
                  : 'border-indigo-200 bg-indigo-50/30'
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-xl ${
                        notification.isRead 
                          ? 'bg-slate-100 text-slate-600' 
                          : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        <Bell size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold text-slate-800 ${notification.isRead ? 'text-slate-600' : ''}`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full">
                          Nova
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 mt-3 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="Marcar como lida"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;

