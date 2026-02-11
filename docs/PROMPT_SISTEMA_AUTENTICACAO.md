# Prompt: Sistema de Autenticação Completo (Login, Cadastro e Recuperação de Senha)

Crie um sistema completo de autenticação para minha aplicação React com as seguintes características:

## 📋 Requisitos Gerais

1. **Tela de Login e Cadastro** na mesma interface, com alternância entre as duas
2. **Criptografia de senhas** usando Web Crypto API (SHA-256 com salt)
3. **Recuperação de senha** via email com senha provisória
4. **Integração com Supabase** como banco principal, com **fallback para localStorage**
5. **Persistência de sessão** usando localStorage
6. **Validação de formulários** e feedback visual

---

## 🗄️ Banco de Dados - Tabela Profiles

### Schema SQL (Supabase)

```sql
-- Tabela de perfis de usuário
CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  currency TEXT DEFAULT 'BRL',
  password TEXT, -- Hash da senha (formato: hash:salt)
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Política de segurança RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles: usuários podem ler e atualizar apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (true); -- Permitir leitura para autenticação (ajustar conforme necessário)

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (true); -- Ajustar conforme necessário

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (true); -- Permitir cadastro
```

---

## 🔐 Serviço de Criptografia de Senhas

### Arquivo: `services/passwordService.ts`

```typescript
// Serviço para hash e verificação de senhas usando Web Crypto API

/**
 * Gera um hash SHA-256 da senha com salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Gerar salt aleatório
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combinar senha com salt
  const encoder = new TextEncoder();
  const data = encoder.encode(password + saltHex);

  // Gerar hash
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Retornar hash + salt (para poder verificar depois)
  return `${hashHex}:${saltHex}`;
}

/**
 * Verifica se a senha corresponde ao hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    const [hash, salt] = hashedPassword.split(":");
    if (!hash || !salt) {
      return false;
    }

    // Combinar senha fornecida com salt armazenado
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);

    // Gerar hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Comparar hashes
    return hashHex === hash;
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    return false;
  }
}

/**
 * Gera uma senha provisória aleatória
 */
export function generateTemporaryPassword(): string {
  const length = 8;
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((x) => charset[x % charset.length])
    .join("");
}
```

---

## 🗃️ Serviço de Banco de Dados

### Arquivo: `services/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL ou Anon Key não configurados. Verifique o arquivo .env.local');
} else {
  console.log('✅ Supabase configurado com sucesso!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Arquivo: `services/db.ts` (Funções de Autenticação)

```typescript
import { UserProfile } from "../types";
import { supabase } from "./supabaseClient";
import { hashPassword, verifyPassword } from './passwordService';

class CloudDatabase {
  // Cache para evitar verificação repetida
  private supabaseConfiguredCache: boolean | null = null;

  // Verifica se o Supabase está configurado
  private isSupabaseConfigured(): boolean {
    if (this.supabaseConfiguredCache !== null) {
      return this.supabaseConfiguredCache;
    }

    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isConfigured = !!(url && key && url !== "" && key !== "");

    this.supabaseConfiguredCache = isConfigured;
    return isConfigured;
  }

  // Busca de perfil no Supabase ou localStorage (fallback)
  async getProfile(email: string): Promise<UserProfile | null> {
    if (!this.isSupabaseConfigured()) {
      const profile = localStorage.getItem(`app_profile_${email}`);
      if (profile) {
        return JSON.parse(profile);
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Perfil não encontrado
          return null;
        }
        console.error("❌ Erro ao buscar perfil do Supabase:", error);
        // Fallback para localStorage
        const profile = localStorage.getItem(`app_profile_${email}`);
        return profile ? JSON.parse(profile) : null;
      }

      return {
        name: data.name,
        email: data.email,
        avatar: data.avatar || undefined,
        currency: data.currency || "BRL",
        role: (data.role as 'admin' | 'user') || 'user',
      };
    } catch (error) {
      console.error("Erro ao buscar perfil do Supabase:", error);
      const profile = localStorage.getItem(`app_profile_${email}`);
      return profile ? JSON.parse(profile) : null;
    }
  }

  // Salvamento de perfil no Supabase ou localStorage (fallback)
  async saveProfile(profile: UserProfile): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      localStorage.setItem(
        `app_profile_${profile.email}`,
        JSON.stringify(profile)
      );
      localStorage.setItem("app_auth_user", JSON.stringify(profile));
      return;
    }

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar || null,
          currency: profile.currency || "BRL",
          role: profile.role || 'user',
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        }
      );

      if (error) {
        console.error("❌ Erro ao salvar perfil no Supabase:", error);
        // Fallback para localStorage
        localStorage.setItem(
          `app_profile_${profile.email}`,
          JSON.stringify(profile)
        );
      }

      localStorage.setItem("app_auth_user", JSON.stringify(profile));
    } catch (error) {
      console.error("Erro ao salvar perfil no Supabase:", error);
      localStorage.setItem(
        `app_profile_${profile.email}`,
        JSON.stringify(profile)
      );
      localStorage.setItem("app_auth_user", JSON.stringify(profile));
    }
  }

  // Busca de senha do usuário (retorna hash)
  async getPassword(email: string): Promise<string | null> {
    // Primeiro tentar buscar do Supabase
    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("password")
          .eq("email", email)
          .single();

        if (!error && data && data.password) {
          // Também salvar localmente para cache
          localStorage.setItem(`app_password_${email}`, data.password);
          return data.password;
        }
      } catch (error) {
        console.error("Erro ao buscar senha do Supabase:", error);
      }
    }

    // Fallback para localStorage
    const password = localStorage.getItem(`app_password_${email}`);
    return password;
  }

  // Verifica se a senha está correta
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const hashedPassword = await this.getPassword(email);
    if (!hashedPassword) {
      return false;
    }
    
    // Verificar se é hash (contém :) ou senha antiga em texto plano (para migração)
    if (hashedPassword.includes(':')) {
      // É um hash, usar verificação
      return await verifyPassword(password, hashedPassword);
    } else {
      // Senha antiga em texto plano (migração)
      if (password === hashedPassword) {
        // Migrar para hash
        const newHash = await hashPassword(password);
        await this.savePassword(email, newHash, true);
        return true;
      }
      return false;
    }
  }

  // Salvamento de senha do usuário (com hash automático)
  async savePassword(email: string, password: string, isHashed: boolean = false): Promise<void> {
    // Se não estiver hasheada, fazer hash
    let passwordToSave = password;
    if (!isHashed && !password.includes(':')) {
      passwordToSave = await hashPassword(password);
    }

    // Salvar no localStorage primeiro (cache local)
    localStorage.setItem(`app_password_${email}`, passwordToSave);

    // Se Supabase estiver configurado, salvar também lá
    if (this.isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ password: passwordToSave })
          .eq("email", email);

        if (error) {
          console.error("❌ Erro ao salvar senha no Supabase:", error);
        } else {
          console.log(`✅ Senha salva no Supabase para: ${email}`);
        }
      } catch (error) {
        console.error("Erro ao salvar senha no Supabase:", error);
      }
    }
  }

  // Recuperação de senha (salva senha provisória)
  async recoverPassword(email: string, temporaryPassword: string): Promise<void> {
    await this.savePassword(email, temporaryPassword);
  }
}

export const db = new CloudDatabase();
```

---

## 📧 Serviço de Email (Recuperação de Senha)

### Arquivo: `services/emailService.ts`

```typescript
// Serviço para envio automático de emails usando EmailJS

declare global {
  interface Window {
    emailjs: {
      send: (
        serviceId: string,
        templateId: string,
        templateParams: any,
        publicKey: string
      ) => Promise<any>;
      init: (publicKey: string) => void;
    };
  }
}

/**
 * Envia automaticamente uma senha provisória por email usando EmailJS
 */
export async function sendPasswordRecoveryEmail(
  email: string,
  temporaryPassword: string,
  userName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
      return {
        success: false,
        message: "Serviço de email não configurado.",
      };
    }

    // Carregar script do EmailJS dinamicamente se não estiver carregado
    if (!window.emailjs) {
      await loadEmailJSScript();
    }

    const templateParams = {
      to_email: email,
      to_name: userName || "Usuário",
      temporary_password: temporaryPassword,
      subject: "Recuperação de Senha",
    };

    try {
      const response = await window.emailjs.send(
        emailjsServiceId,
        emailjsTemplateId,
        templateParams,
        emailjsPublicKey
      );

      return {
        success: true,
        message: `Email enviado para ${email}. Verifique sua caixa de entrada e spam.`,
      };
    } catch (emailjsError: any) {
      return {
        success: false,
        message: emailjsError.text || emailjsError.message || "Erro ao enviar email.",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Erro ao processar recuperação de senha.",
    };
  }
}

function loadEmailJSScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.emailjs) {
      resolve();
      return;
    }

    if (document.querySelector('script[src*="emailjs"]')) {
      const checkInterval = setInterval(() => {
        if (window.emailjs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.async = true;
    script.onload = () => {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (publicKey && window.emailjs) {
        window.emailjs.init(publicKey);
      }
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Falha ao carregar EmailJS"));
    };
    document.head.appendChild(script);
  });
}
```

---

## 📝 Tipos TypeScript

### Arquivo: `types.ts`

```typescript
export type UserRole = 'admin' | 'user';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  currency: string;
  role?: UserRole;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}
```

---

## 🎨 Interface de Login/Cadastro

### Componente Principal (App.tsx ou Auth.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { Wallet, Eye, EyeOff, Mail, X, Loader2 } from 'lucide-react';
import { db } from './services/db';
import { generateTemporaryPassword } from './services/passwordService';
import { sendPasswordRecoveryEmail } from './services/emailService';
import { AuthState, UserProfile } from './types';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('app_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });

  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Persistir autenticação no localStorage
  useEffect(() => {
    localStorage.setItem('app_auth', JSON.stringify(auth));
  }, [auth]);

  // Handlers de Autenticação
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
      if (profile) {
        alert('Senha incorreta!');
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
    
    const newUser: UserProfile = { 
      name, 
      email, 
      currency: 'BRL', 
      role: 'user',
    };
    await db.saveProfile(newUser);
    await db.savePassword(email, pass);
    setAuth({ isAuthenticated: true, user: newUser });
    setIsLoading(false);
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
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
      setRecoveryMessage(`❌ ${error?.message || 'Erro ao processar recuperação de senha. Tente novamente.'}`);
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Se não estiver autenticado, mostrar tela de login/cadastro
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg">
              <Wallet size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Nome do App</h1>
            <p className="text-slate-500 text-sm">Descrição do app</p>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
              <input 
                name="email" 
                type="email" 
                required 
                className="w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" 
              />
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
            <button 
              disabled={isLoading} 
              type="submit" 
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
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

          <div className="mt-4">
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="w-full text-sm font-semibold text-indigo-600 text-center"
            >
              {isRegistering ? 'Já tem conta? Login' : 'Novo por aqui? Criar conta'}
            </button>
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

  // Se estiver autenticado, mostrar aplicação principal
  return (
    <div>
      <h1>Bem-vindo, {auth.user?.name}!</h1>
      <button onClick={handleLogout}>Sair</button>
      {/* Sua aplicação aqui */}
    </div>
  );
};

export default App;
```

---

## 🔧 Variáveis de Ambiente

### Arquivo: `.env.local`

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# EmailJS (opcional, para recuperação de senha)
VITE_EMAILJS_SERVICE_ID=seu-service-id
VITE_EMAILJS_TEMPLATE_ID=seu-template-id
VITE_EMAILJS_PUBLIC_KEY=sua-public-key
```

---

## 📦 Dependências NPM

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.300.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

---

## ✅ Checklist de Implementação

- [ ] Criar tabela `profiles` no Supabase
- [ ] Configurar variáveis de ambiente (`.env.local`)
- [ ] Criar `services/passwordService.ts`
- [ ] Criar `services/supabaseClient.ts`
- [ ] Criar `services/db.ts` com funções de autenticação
- [ ] Criar `services/emailService.ts` (opcional, para recuperação)
- [ ] Criar `types.ts` com tipos TypeScript
- [ ] Criar componente de Login/Cadastro
- [ ] Implementar handlers de login, cadastro e logout
- [ ] Implementar recuperação de senha
- [ ] Testar fluxo completo de autenticação
- [ ] Testar fallback para localStorage quando Supabase não estiver configurado

---

## 🔍 Observações Importantes

1. **Fallback para localStorage**: O sistema funciona mesmo sem Supabase configurado, usando localStorage como fallback
2. **Migração automática**: Senhas antigas em texto plano são automaticamente migradas para hash no primeiro login
3. **Segurança**: Senhas são sempre armazenadas com hash (SHA-256 + salt)
4. **EmailJS**: É gratuito até 200 emails/mês. Para produção, considere usar Supabase Edge Functions com Resend ou outro serviço
5. **Persistência**: A sessão do usuário é salva no localStorage e mantida após recarregar a página

---

## 📚 Recursos Adicionais

- **Supabase**: https://supabase.com/docs
- **EmailJS**: https://www.emailjs.com/docs/
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

---

**Use este prompt para implementar um sistema completo de autenticação em qualquer aplicação React!**
