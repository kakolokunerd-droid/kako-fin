
import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Camera, Save, Lock, Eye, EyeOff, CheckCircle2, LogOut, Share2, Heart, Copy, UserCog } from 'lucide-react';
import { UserProfile, UserRole } from '../types';

interface ProfileProps {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onChangePassword: (oldP: string, newP: string) => Promise<boolean>;
  onLogout?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onChangePassword, onLogout }) => {
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
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

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
    } else {
      setPassError('Senha atual incorreta.');
    }
  };

  const handleShareApp = () => {
    const message = `💰 *Kako Fin - Controle suas Finanças*

✨ Descubra uma nova forma de gerenciar seu dinheiro com inteligência!

🎯 *O que você pode fazer:*
• Controle de receitas e despesas
• Metas financeiras personalizadas
• Relatórios e gráficos detalhados
• Insights inteligentes com IA
• Sincronização em nuvem

📊 Visualize seu dashboard completo e tome decisões financeiras mais inteligentes!

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

        <form onSubmit={handlePasswordUpdate} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Shield size={20} className="text-indigo-600" />
            Segurança
          </h4>

          {passError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium">{passError}</div>}
          {passSuccess && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl font-medium flex items-center gap-2"><CheckCircle2 size={16} /> Senha alterada com sucesso!</div>}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Senha Atual</label>
              <input type={showPass ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 bottom-3.5 text-slate-400 hover:text-indigo-600">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nova Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirme</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-slate-900 transition-all">
            Atualizar Senha
          </button>
        </form>
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
              <Shield size={20} className="text-indigo-600" />
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
    </div>
  );
};

export default Profile;
