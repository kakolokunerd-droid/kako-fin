# Como Testar o PWA Localmente

Você pode testar o PWA localmente sem precisar fazer deploy! Aqui estão as opções:

## ✅ Opção 1: Testar em Modo de Desenvolvimento (Mais Fácil)

O PWA funciona em `localhost` sem necessidade de HTTPS!

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse no navegador:**
   - Abra `http://localhost:3000`
   - O Service Worker será registrado automaticamente

3. **Teste a instalação:**
   - **Chrome/Edge Desktop**: Procure pelo ícone de instalação na barra de endereços
   - **Chrome DevTools**: Vá em "Application" → "Service Workers" para verificar se está registrado
   - **Lighthouse**: Execute um teste PWA (F12 → Lighthouse → Progressive Web App)

## ✅ Opção 2: Testar com Build de Produção Localmente

1. **Gere o build:**
   ```bash
   npm run build
   ```

2. **Sirva o build localmente:**
   ```bash
   npm run serve
   ```
   Ou use:
   ```bash
   npm run preview
   ```

3. **Acesse:**
   - `http://localhost:3000` (ou a porta que aparecer)

## ✅ Opção 3: Usar um Servidor HTTP Simples (Python)

Se quiser testar o build em uma porta diferente:

1. **Gere o build:**
   ```bash
   npm run build
   ```

2. **Entre na pasta dist:**
   ```bash
   cd dist
   ```

3. **Inicie um servidor Python:**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Ou Python 2
   python -m SimpleHTTPServer 8000
   ```

4. **Acesse:**
   - `http://localhost:8000`

## ✅ Opção 4: Usar um Servidor HTTP Simples (Node.js)

1. **Instale o http-server globalmente:**
   ```bash
   npm install -g http-server
   ```

2. **Gere o build:**
   ```bash
   npm run build
   ```

3. **Sirva a pasta dist:**
   ```bash
   cd dist
   http-server -p 8000
   ```

4. **Acesse:**
   - `http://localhost:8000`

## 📱 Testando no Celular (Mesma Rede)

Para testar no celular enquanto desenvolve:

1. **Descubra o IP da sua máquina:**
   - Windows: `ipconfig` (procure por IPv4)
   - Mac/Linux: `ifconfig` ou `ip addr`

2. **Inicie o servidor com host 0.0.0.0:**
   ```bash
   npm run dev
   ```
   (Já está configurado no vite.config.ts)

3. **Acesse do celular:**
   - `http://SEU_IP:3000`
   - Exemplo: `http://192.168.1.100:3000`

## 🔍 Verificando se o PWA Está Funcionando

### No Chrome DevTools:

1. Abra o DevTools (F12)
2. Vá em **Application** → **Service Workers**
   - Deve mostrar "activated and is running"
3. Vá em **Application** → **Manifest**
   - Deve mostrar todas as informações do manifest
4. Vá em **Lighthouse** → Execute teste "Progressive Web App"
   - Deve passar nos critérios básicos

### Verificar Instalação:

- **Desktop**: Procure pelo ícone de instalação (➕) na barra de endereços
- **Android**: Deve aparecer banner "Adicionar à tela inicial"
- **iOS**: Menu compartilhar → "Adicionar à Tela de Início"

## ⚠️ Notas Importantes

1. **Service Worker só funciona em:**
   - `localhost`
   - `127.0.0.1`
   - HTTPS
   - Não funciona em `file://`

2. **Para testar HTTPS localmente** (opcional):
   - Use `mkcert` para criar certificados locais
   - Ou use `ngrok` para criar um túnel HTTPS

3. **Ícones:**
   - Mesmo sem os ícones, o PWA funcionará
   - Mas para uma experiência completa, adicione os ícones na pasta `public/`

## 🐛 Troubleshooting

### Service Worker não registra:
- Verifique o console do navegador
- Certifique-se de estar em `localhost` ou `127.0.0.1`
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### Manifest não aparece:
- Verifique se o arquivo `manifest.json` está na raiz do projeto
- Verifique o console para erros
- Abra `http://localhost:3000/manifest.json` para verificar se está acessível

### PWA não aparece como instalável:
- Verifique se todos os requisitos estão atendidos (manifest, service worker, HTTPS/localhost)
- Use o Lighthouse para verificar o que está faltando

