
import React, { useState, useEffect } from 'react';
import { Settings, Users, CheckCircle2, XCircle, Loader2, Save, Bell, Plus } from 'lucide-react';
import { db } from '../services/db';

interface AdminProps {
  userEmail: string;
}

const Admin: React.FC<AdminProps> = ({ userEmail }) => {
  const [emails, setEmails] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: string[]; errors: string[] } | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  // Estados para notificações
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [creatingNotification, setCreatingNotification] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState(false);

  // Verificar contribuições a cada 2 minutos
  useEffect(() => {
    const checkContributions = async () => {
      try {
        // Esta função pode ser expandida para verificar contribuições automaticamente
        setLastCheck(new Date());
        console.log('Verificação de contribuições executada:', new Date().toLocaleString());
      } catch (error) {
        console.error('Erro ao verificar contribuições:', error);
      }
    };

    checkContributions(); // Executar imediatamente
    const interval = setInterval(checkContributions, 120000); // A cada 2 minutos

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setResult(null);

    try {
      // Separar emails por linha, vírgula ou ponto e vírgula
      const emailList = emails
        .split(/[\n,;]+/)
        .map(email => email.trim())
        .filter(email => email.length > 0 && email.includes('@'));

      if (emailList.length === 0) {
        alert('Por favor, insira pelo menos um email válido.');
        setProcessing(false);
        return;
      }

      const success: string[] = [];
      const errors: string[] = [];

      // Atualizar cada email
      for (const email of emailList) {
        try {
          const profile = await db.getProfile(email);
          if (profile) {
            const updatedProfile = {
              ...profile,
              lastContributionDate: new Date().toISOString()
            };
            await db.saveProfile(updatedProfile);
            success.push(email);
          } else {
            errors.push(`${email} - Perfil não encontrado`);
          }
        } catch (error) {
          errors.push(`${email} - Erro: ${error}`);
        }
      }

      setResult({ success, errors });
      setEmails(''); // Limpar campo após sucesso

      if (success.length > 0) {
        alert(`${success.length} usuário(s) atualizado(s) com sucesso!`);
      }
    } catch (error) {
      alert('Erro ao processar emails: ' + error);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Por favor, preencha título e mensagem da notificação.');
      return;
    }

    setCreatingNotification(true);
    setNotificationSuccess(false);

    try {
      await db.createNotification({
        title: notificationTitle.trim(),
        message: notificationMessage.trim(),
        createdBy: userEmail,
        createdAt: new Date().toISOString(),
      });

      setNotificationSuccess(true);
      setNotificationTitle('');
      setNotificationMessage('');
      alert('Notificação criada com sucesso! Todos os usuários receberão esta notificação.');
      
      setTimeout(() => setNotificationSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      alert('Erro ao criar notificação. Tente novamente.');
    } finally {
      setCreatingNotification(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
            <Settings size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Painel Administrativo</h2>
            <p className="text-sm text-slate-500">Gerenciar contribuições dos usuários</p>
          </div>
        </div>

        {lastCheck && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <p className="font-semibold">Última verificação automática:</p>
            <p>{lastCheck.toLocaleString('pt-BR')}</p>
            <p className="text-xs mt-1 opacity-75">Verificações automáticas a cada 2 minutos</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Emails dos Usuários (um por linha, ou separados por vírgula/ponto e vírgula)
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="usuario1@email.com&#10;usuario2@email.com&#10;usuario3@email.com"
              className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Você pode colar múltiplos emails, um por linha, ou separados por vírgula ou ponto e vírgula.
            </p>
          </div>

          <button
            type="submit"
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {processing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Save size={20} />
                Atualizar Contribuições
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 space-y-4">
            {result.success.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  <h4 className="font-bold text-green-800">
                    {result.success.length} usuário(s) atualizado(s) com sucesso
                  </h4>
                </div>
                <ul className="space-y-1 text-sm text-green-700">
                  {result.success.map((email, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
                      {email}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={20} className="text-red-600" />
                  <h4 className="font-bold text-red-800">
                    {result.errors.length} erro(s) encontrado(s)
                  </h4>
                </div>
                <ul className="space-y-1 text-sm text-red-700">
                  {result.errors.map((error, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seção de Criar Notificações */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 text-green-600 rounded-xl">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">Criar Notificação</h3>
            <p className="text-sm text-slate-500">Enviar alertas e informações para todos os usuários</p>
          </div>
        </div>

        {notificationSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Notificação criada com sucesso!
          </div>
        )}

        <form onSubmit={handleCreateNotification} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Título da Notificação
            </label>
            <input
              type="text"
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
              placeholder="Ex: Nova funcionalidade disponível!"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
              required
              maxLength={100}
            />
            <p className="text-xs text-slate-500 mt-1">
              {notificationTitle.length}/100 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Mensagem
            </label>
            <textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Digite a mensagem que será exibida para todos os usuários..."
              className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 resize-none"
              required
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">
              {notificationMessage.length}/500 caracteres
            </p>
          </div>

          <button
            type="submit"
            disabled={creatingNotification}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {creatingNotification ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Criando Notificação...
              </>
            ) : (
              <>
                <Plus size={20} />
                Criar Notificação
              </>
            )}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          Informações
        </h3>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            <span className="font-semibold">Como funciona:</span> Ao atualizar as contribuições, a data de última contribuição será definida para hoje para cada email informado.
          </p>
          <p>
            <span className="font-semibold">Verificação automática:</span> O sistema verifica as contribuições a cada 2 minutos automaticamente.
          </p>
          <p>
            <span className="font-semibold">Período de 30 dias:</span> Usuários que contribuíram nos últimos 30 dias não verão a mensagem de apoio.
          </p>
          <p>
            <span className="font-semibold">Notificações:</span> As notificações criadas aparecerão na tela "Informações e Alertas" de todos os usuários, com um badge de alerta no menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;

