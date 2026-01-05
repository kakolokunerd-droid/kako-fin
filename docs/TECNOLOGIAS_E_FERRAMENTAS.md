# 🛠️ Tecnologias e Ferramentas Utilizadas

Este documento lista todas as tecnologias, bibliotecas, bancos de dados e ferramentas online utilizadas no projeto Kako Fin, incluindo URLs para facilitar a configuração em novos projetos.

---

## 📦 Tecnologias Principais

### Frontend

| Tecnologia | Versão | Descrição | URL |
|------------|--------|-----------|-----|
| **React** | 19.2.3 | Biblioteca JavaScript para construção de interfaces | https://react.dev/ |
| **TypeScript** | 5.8.2 | Superset do JavaScript com tipagem estática | https://www.typescriptlang.org/ |
| **Vite** | 6.2.0 | Build tool e dev server rápido | https://vitejs.dev/ |
| **Tailwind CSS** | - | Framework CSS utility-first | https://tailwindcss.com/ |

### Bibliotecas e Dependências

| Biblioteca | Versão | Descrição | URL |
|------------|--------|-----------|-----|
| **recharts** | 3.6.0 | Biblioteca de gráficos para React | https://recharts.org/ |
| **lucide-react** | 0.562.0 | Ícones SVG para React | https://lucide.dev/ |
| **canvas** | 3.2.0 | Renderização de canvas (para geração de ícones) | https://www.npmjs.com/package/canvas |
| **@vitejs/plugin-react** | 5.0.0 | Plugin React para Vite | https://github.com/vitejs/vite-plugin-react |

---

## 🗄️ Banco de Dados

### Supabase

| Item | Descrição | URL |
|------|-----------|-----|
| **Supabase** | Backend-as-a-Service (BaaS) com PostgreSQL | https://supabase.com/ |
| **Dashboard** | Painel de controle do Supabase | https://app.supabase.com/ |
| **Documentação** | Documentação oficial | https://supabase.com/docs |
| **@supabase/supabase-js** | Cliente JavaScript oficial | https://supabase.com/docs/reference/javascript |

**Recursos utilizados:**
- PostgreSQL (banco de dados relacional)
- Autenticação de usuários
- Armazenamento de dados em nuvem
- API REST automática
- Real-time subscriptions

**Plano:** Free tier (gratuito com limitações)

---

## 🤖 Inteligência Artificial

### Provedores de IA Suportados

#### 1. Groq ⭐ (Recomendado)

| Item | Descrição | URL |
|------|-----------|-----|
| **Groq** | API de IA com modelos LLM rápidos | https://groq.com/ |
| **Console** | Painel de controle e API keys | https://console.groq.com/ |
| **Documentação** | Documentação da API | https://console.groq.com/docs |
| **Modelos** | Lista de modelos disponíveis | https://console.groq.com/docs/models |

**Características:**
- Gratuito: 14,400 requests/dia
- Muito rápido (respostas em milissegundos)
- Sem necessidade de cartão de crédito
- Modelos: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768

#### 2. Hugging Face

| Item | Descrição | URL |
|------|-----------|-----|
| **Hugging Face** | Plataforma de modelos de IA | https://huggingface.co/ |
| **Inference API** | API para inferência de modelos | https://huggingface.co/docs/api-inference |
| **Access Tokens** | Gerenciamento de tokens | https://huggingface.co/settings/tokens |

**Características:**
- Gratuito com rate limits
- Muitos modelos disponíveis
- Sem necessidade de cartão

#### 3. Google Gemini

| Item | Descrição | URL |
|------|-----------|-----|
| **Google AI Studio** | Plataforma do Google para IA | https://aistudio.google.com/ |
| **API Keys** | Gerenciamento de chaves | https://aistudio.google.com/app/apikey |
| **Documentação** | Documentação da API Gemini | https://ai.google.dev/docs |
| **@google/genai** | Biblioteca JavaScript | https://www.npmjs.com/package/@google/genai |

**⚠️ Nota:** Requer configuração de faturamento no Google Cloud

#### 4. OpenAI

| Item | Descrição | URL |
|------|-----------|-----|
| **OpenAI** | Plataforma de IA da OpenAI | https://openai.com/ |
| **API Platform** | Painel de controle | https://platform.openai.com/ |
| **Documentação** | Documentação da API | https://platform.openai.com/docs |

#### 5. Ollama (Local)

| Item | Descrição | URL |
|------|-----------|-----|
| **Ollama** | Execução local de modelos LLM | https://ollama.ai/ |
| **Download** | Download e instalação | https://ollama.ai/download |
| **Modelos** | Biblioteca de modelos | https://ollama.ai/library |

**Características:**
- 100% gratuito (roda localmente)
- Sem limites de uso
- Privacidade total (dados não saem do computador)

---

## 📧 Serviços de Email

### EmailJS

| Item | Descrição | URL |
|------|-----------|-----|
| **EmailJS** | Serviço de envio de emails do frontend | https://www.emailjs.com/ |
| **Dashboard** | Painel de controle | https://dashboard.emailjs.com/ |
| **Documentação** | Documentação oficial | https://www.emailjs.com/docs |
| **Templates** | Gerenciamento de templates | https://dashboard.emailjs.com/admin/templates |

**Características:**
- Gratuito até 200 emails/mês
- Envio direto do frontend (sem backend necessário)
- Suporte a templates HTML
- Sem necessidade de servidor próprio

**Recursos utilizados:**
- Envio de emails de recuperação de senha
- Templates personalizados
- Integração direta do frontend

---

## 🚀 Hospedagem e Deploy

### Vercel

| Item | Descrição | URL |
|------|-----------|-----|
| **Vercel** | Plataforma de deploy e hospedagem | https://vercel.com/ |
| **Dashboard** | Painel de controle | https://vercel.com/dashboard |
| **Documentação** | Documentação oficial | https://vercel.com/docs |
| **Deploy Guide** | Guia de deploy | https://vercel.com/docs/deployments/overview |

**Características:**
- Plano gratuito disponível
- Deploy automático via GitHub
- SSL automático
- CDN global
- Variáveis de ambiente configuráveis

**Recursos utilizados:**
- Deploy automático
- Variáveis de ambiente
- Domínio personalizado (opcional)
- Analytics (opcional)

---

## 🎨 Design e UI

### Ícones

| Ferramenta | Descrição | URL |
|------------|-----------|-----|
| **Lucide Icons** | Biblioteca de ícones SVG | https://lucide.dev/ |
| **Icon Library** | Galeria de ícones | https://lucide.dev/icons |

### Cores e Estilo

- **Tailwind CSS**: Framework CSS utility-first
- **Design System**: Customizado com cores e componentes próprios

---

## 🔐 Segurança

### Criptografia

| Tecnologia | Descrição | Uso |
|------------|-----------|-----|
| **Web Crypto API** | API nativa do navegador para criptografia | Hash de senhas (SHA-256) |
| **PBKDF2** | Algoritmo de derivação de chave | Hash de senhas com salt |

**Implementação:**
- Hash de senhas usando SHA-256
- Salt aleatório para cada senha
- Recuperação de senha com senha temporária

---

## 📱 PWA (Progressive Web App)

| Recurso | Descrição | URL |
|---------|-----------|-----|
| **Service Worker** | Cache e funcionamento offline | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API |
| **Web App Manifest** | Configuração do PWA | https://developer.mozilla.org/en-US/docs/Web/Manifest |
| **PWA Builder** | Ferramenta para criar PWAs | https://www.pwabuilder.com/ |

**Recursos implementados:**
- Instalação como app
- Funcionamento offline
- Ícones e splash screens
- Cache de recursos

---

## 🛠️ Ferramentas de Desenvolvimento

### Build e Deploy

| Ferramenta | Descrição | URL |
|------------|-----------|-----|
| **npm** | Gerenciador de pacotes Node.js | https://www.npmjs.com/ |
| **Git** | Controle de versão | https://git-scm.com/ |
| **GitHub** | Hospedagem de repositórios | https://github.com/ |

### Desenvolvimento

| Ferramenta | Descrição | URL |
|------------|-----------|-----|
| **VS Code** | Editor de código (recomendado) | https://code.visualstudio.com/ |
| **Node.js** | Runtime JavaScript | https://nodejs.org/ |

---

## 📋 Variáveis de Ambiente

### Configuração Local (`.env.local`)

```env
# Banco de Dados
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# Inteligência Artificial
VITE_AI_PROVIDER=groq
VITE_AI_API_KEY=sua_chave_groq_aqui
VITE_AI_MODEL=llama-3.3-70b-versatile

# Email (Opcional)
VITE_EMAILJS_SERVICE_ID=seu_service_id
VITE_EMAILJS_TEMPLATE_ID=seu_template_id
VITE_EMAILJS_PUBLIC_KEY=sua_public_key

# Gemini (Alternativa - requer faturamento)
GEMINI_API_KEY=sua_chave_gemini_aqui
```

### Configuração na Vercel

As mesmas variáveis devem ser configuradas no painel da Vercel:
- Settings → Environment Variables

---

## 📚 Documentação Adicional

Todos os guias de configuração estão na pasta `docs/`:

- `AI_PROVIDERS_SETUP.md` - Configuração de provedores de IA
- `SUPABASE_SETUP.md` - Configuração do Supabase
- `EMAIL_SETUP_EMAILJS.md` - Configuração do EmailJS
- `DEPLOY_VERCEL.md` - Guia de deploy na Vercel
- `PASSWORD_SECURITY.md` - Segurança de senhas
- E outros...

---

## 🔗 Links Rápidos

### Configuração Inicial

1. **Supabase**: https://app.supabase.com/
2. **Groq**: https://console.groq.com/
3. **EmailJS**: https://dashboard.emailjs.com/
4. **Vercel**: https://vercel.com/dashboard

### Documentação

1. **React**: https://react.dev/
2. **TypeScript**: https://www.typescriptlang.org/docs/
3. **Vite**: https://vitejs.dev/guide/
4. **Supabase**: https://supabase.com/docs
5. **Tailwind CSS**: https://tailwindcss.com/docs

---

## 💡 Dicas para Novos Projetos

1. **Comece pelo Supabase**: Configure o banco de dados primeiro
2. **Use Groq para IA**: É gratuito e muito rápido
3. **EmailJS para emails**: Fácil de configurar e gratuito
4. **Vercel para deploy**: Deploy automático e gratuito
5. **Mantenha as variáveis organizadas**: Use `.env.local` para desenvolvimento

---

## 📝 Notas Importantes

- **Plano Gratuito**: Todas as ferramentas principais têm planos gratuitos
- **Limites**: Verifique os limites de cada serviço no plano gratuito
- **Segurança**: Nunca commite arquivos `.env.local` no Git
- **Backup**: Configure backups regulares do Supabase
- **Monitoramento**: Use os dashboards de cada serviço para monitorar uso

---

**Última atualização:** Janeiro 2025

