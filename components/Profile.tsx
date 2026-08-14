
import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Camera, Save, Lock, Eye, EyeOff, CheckCircle2, LogOut, Share2, Heart, Copy, UserCog, Crown, Zap, Star, ArrowRight, Moon, Sun, Monitor } from 'lucide-react';
import { UserProfile, UserRole, SubscriptionPlan } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { AuthState } from '../types';
import { ThemePreference, getStoredTheme, setThemePreference } from '../services/theme';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onChangePassword: (oldP: string, newP: string) => Promise<boolean>;
  onLogout?: () => void;
  auth: AuthState;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onChangePassword, onLogout, auth }) => {
  const subscription = useSubscription(auth);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar || '');
  const [role, setRole] = useState<UserRole>(user.role || 'user');
  const [saving, setSaving] = useState(false);
  const isAdmin = user.role === 'admin';
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => getStoredTheme());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Imagem muito grande! Escolha uma imagem de até 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatar(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGeneralUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onUpdate({ ...user, name, email, avatar, role });
    setSaving(false);
    alert('Perfil sincronizado com a nuvem!');
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess(false);

    if (newPassword !== confirmPassword) {
      setPassError('As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const success = await onChangePassword(currentPassword, newPassword);
    if (success) {
      setPassSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPass(false);
      setShowNewPass(false);
      setPassError('');
      // Fechar o modal após sucesso
      setTimeout(() => {
        setShowSecurityModal(false);
      }, 500);
    } else {
      setPassError('Senha atual incorreta.');
    }
  };

  const handleShareApp = () => {
    const message = `💰 *Kako Fin - Controle suas Finanças*

✨ Descubra uma nova forma de gerenciar seu dinheiro com inteligência!

🎯 *O que você pode fazer:*
• Controle de receitas e despesas
• Orçamento por categoria e contas longas (parcelamentos)
• Metas, score de saúde financeira e previsão
• Exportação CSV e lista de compras
• Insights e relatórios avançados (Premium Plus)

📊 Organize o mês, evite surpresas e tome decisões melhores!

🚀 Comece hoje mesmo a planejar seus sonhos e alcance sua liberdade financeira!

📱 Acesse agora: https://kako-fin.vercel.app/

💡 Junte-se a mim e transforme sua relação com o dinheiro! ✨`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-3xl shadow-lg">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-indigo-600 border border-slate-200 overflow-hidden relative group cursor-pointer"
            >
              {avatar ? (
                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold">{name.charAt(0)}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="text-white" size={24} />
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-8 px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">{name}</h3>
            <p className="text-slate-500">{email}</p>
          </div>
          <div className="flex items-center gap-2">
            <p className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              user.role === 'admin' 
                ? 'bg-purple-100 text-purple-600' 
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {user.role === 'admin' ? 'Administrador' : 'Usuário'}
            </p>
            <p className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider">
              Sincronização Ativa
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Plan Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Crown size={20} className="text-teal-500" />
            Plano de Assinatura
          </h4>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-indigo-50 rounded-xl border border-teal-200">
            <div className="flex items-center gap-3">
              {subscription.plan === 'trial' && <Zap className="text-yellow-500" size={24} />}
              {subscription.plan === 'basic' && <Zap className="text-yellow-500" size={24} />}
              {subscription.plan === 'premium' && <Star className="text-purple-500" size={24} />}
              {subscription.plan === 'premium_plus' && <Crown className="text-teal-500" size={24} />}
              <div>
                <p className="font-bold text-slate-900">
                  {subscription.plan === 'trial' && 'Trial - Gratuito Permanente'}
                  {subscription.plan === 'basic' && 'Basic - R$ 4,99/mês'}
                  {subscription.plan === 'premium' && 'Premium - R$ 9,99/mês'}
                  {subscription.plan === 'premium_plus' && 'Premium Plus - R$ 19,99/mês'}
                </p>
                {subscription.isTrial && (
                  <p className="text-sm text-slate-600">
                    Gratuito permanente - Sem vencimento
                  </p>
                )}
                {!subscription.isTrial && (
                  <p className="text-sm text-slate-600">
                    Plano ativo
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('change-tab', { detail: 'pricing' });
                window.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl font-semibold hover:bg-teal-600 transition-colors"
            >
              <ArrowRight size={18} />
              Trocar Plano
            </button>
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Funcionalidades disponíveis no seu plano:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Dashboard</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Transações</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Orçamento</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Contas longas</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Metas</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
                <p className="font-semibold text-sm">Compras / CSV</p>
                <p className="text-xs mt-1">✓ Disponível</p>
              </div>
              <div className={`p-3 rounded-lg border ${
                subscription.canAccessInsights 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <p className="font-semibold text-sm">Insights IA</p>
                <p className="text-xs mt-1">{subscription.canAccessInsights ? '✓ Disponível' : '✗ Premium Plus'}</p>
              </div>
              <div className={`p-3 rounded-lg border ${
                subscription.canAccessReports 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                <p className="font-semibold text-sm">Relatórios</p>
                <p className="text-xs mt-1">{subscription.canAccessReports ? '✓ Disponível' : '✗ Premium Plus'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Status Section */}
      {user.lastContributionDate && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <Heart size={20} className="text-pink-500" />
              Status de Contribuição
            </h4>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 text-green-700 rounded-xl text-sm">
              <p className="font-semibold mb-1">✅ Obrigado pela sua contribuição!</p>
              <p className="text-xs">
                Última contribuição: {new Date(user.lastContributionDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              A mensagem de apoio será ocultada por 30 dias após sua contribuição.
            </p>
          </div>
        </div>
      )}

      {/* Aparência / Tema */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Moon size={20} className="text-indigo-600" />
          Aparência
        </h4>
        <p className="text-sm text-slate-500 mb-4">
          No iPhone, use &quot;Sistema&quot; para seguir o modo escuro do aparelho. No PC você também pode forçar claro ou escuro.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {([
            { id: 'light' as ThemePreference, label: 'Claro', icon: Sun },
            { id: 'dark' as ThemePreference, label: 'Escuro', icon: Moon },
            { id: 'system' as ThemePreference, label: 'Sistema', icon: Monitor },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setThemePreference(id);
                setThemePreferenceState(id);
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                themePreference === id
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300'
              }`}
            >
              <Icon size={22} />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleGeneralUpdate} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <User size={20} className="text-indigo-600" />
            Dados Cadastrais
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">E-mail</label>
              <input type="email" value={email} readOnly className="w-full px-4 py-3 bg-slate-100 border rounded-xl outline-none text-slate-500 cursor-not-allowed" title="E-mail não pode ser alterado" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Usuário</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={!isAdmin}
                className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isAdmin 
                    ? 'bg-slate-50' 
                    : 'bg-slate-100 text-slate-500 cursor-not-allowed'
                }`}
                title={isAdmin ? 'Altere o tipo de usuário' : 'Apenas administradores podem alterar'}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
              {!isAdmin && (
                <p className="text-xs text-slate-400 mt-1">Apenas administradores podem alterar o tipo de usuário</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Sincronizando...' : <><Save size={20} /> Salvar Alterações</>}
          </button>
        </form>

        {/* Botão para abrir modal de segurança */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            Segurança
          </h4>
          {passSuccess && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl font-medium flex items-center gap-2">
              <CheckCircle2 size={16} /> Senha alterada com sucesso!
            </div>
          )}
          <p className="text-sm text-slate-500">
            Altere sua senha e configure as opções de segurança da sua conta.
          </p>
          <button
            onClick={() => {
              setShowSecurityModal(true);
              setPassSuccess(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-slate-900 transition-all"
          >
            <Lock size={20} />
            Alterar Senha
          </button>
        </div>
      </div>

      {/* Share App Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Share2 size={20} className="text-indigo-600" />
            Compartilhar App
          </h4>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Convide seus amigos e familiares para também controlarem suas finanças com o Kako Fin!
        </p>
        <button
          onClick={handleShareApp}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-green-50 text-green-600 rounded-xl font-bold hover:bg-green-100 transition-all border border-green-200"
        >
          <Share2 size={20} />
          <span>Compartilhar via WhatsApp</span>
        </button>
      </div>

      {/* Logout Section */}
      {onLogout && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <LogOut size={20} className="text-indigo-600" />
              Sessão
            </h4>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-200"
          >
            <LogOut size={20} />
            <span>Sair da Conta</span>
          </button>
        </div>
      )}

      {/* Modal de Segurança */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Shield size={20} className="text-indigo-600" />
                Alterar Senha
              </h3>
            </div>
            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-4">
              {passError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium">{passError}</div>}

              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha Atual</label>
                  <input type={showPass ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 bottom-3.5 text-slate-400 hover:text-indigo-600">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nova Senha</label>
                  <input type={showNewPass ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 bottom-3.5 text-slate-400 hover:text-indigo-600">
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirme a Nova Senha</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 ${confirmPassword && newPassword === confirmPassword ? 'border-green-500' : ''}`} />
                  {confirmPassword && newPassword === confirmPassword && (
                    <div className="absolute right-4 bottom-3.5 text-green-600">
                      <CheckCircle2 size={18} />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSecurityModal(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPass(false);
                    setShowNewPass(false);
                    setPassError('');
                    setPassSuccess(false);
                  }}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-slate-800 text-white font-bold hover:bg-slate-900 rounded-xl"
                >
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
