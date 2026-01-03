# Configuração PWA - Kako Fin

Este guia explica como configurar o Progressive Web App (PWA) para que os usuários possam instalar o Kako Fin como um aplicativo nativo em seus dispositivos.

## ✅ Arquivos Criados

1. **manifest.json** - Define como o app aparece quando instalado
2. **public/sw.js** - Service Worker para cache e funcionamento offline
3. **Atualizações no index.html** - Meta tags e referências ao manifest
4. **Atualizações no index.tsx** - Registro do Service Worker

## 📱 Ícones Necessários

Para que o PWA funcione completamente, você precisa criar os seguintes ícones e colocá-los na pasta `public/`:

- `icon-72x72.png` (72x72 pixels)
- `icon-96x96.png` (96x96 pixels)
- `icon-128x128.png` (128x128 pixels)
- `icon-144x144.png` (144x144 pixels)
- `icon-152x152.png` (152x152 pixels)
- `icon-192x192.png` (192x192 pixels) - **Obrigatório**
- `icon-384x384.png` (384x384 pixels)
- `icon-512x512.png` (512x512 pixels) - **Obrigatório**

### Como Criar os Ícones

1. **Crie um ícone base** (recomendado: 512x512 pixels) com o logo do Kako Fin
2. **Use uma ferramenta online** para gerar todos os tamanhos:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/

3. **Ou use uma ferramenta de linha de comando**:
   ```bash
   # Se tiver ImageMagick instalado
   convert icon-512x512.png -resize 72x72 icon-72x72.png
   convert icon-512x512.png -resize 96x96 icon-96x96.png
   # ... e assim por diante
   ```

## 🚀 Funcionalidades do PWA

### ✅ Já Implementado

- ✅ Manifest.json configurado
- ✅ Service Worker para cache
- ✅ Meta tags para iOS e Android
- ✅ Registro automático do Service Worker
- ✅ Estratégia de cache (Network First)
- ✅ Funcionamento offline básico
- ✅ Banner de instalação automático

## 🧪 Testando Localmente

**Você NÃO precisa fazer deploy para testar!** O PWA funciona em `localhost`:

1. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

2. **Acesse:** `http://localhost:3000`

3. **Verifique no DevTools:**
   - F12 → Application → Service Workers (deve estar ativo)
   - F12 → Application → Manifest (deve mostrar as informações)
   - F12 → Lighthouse → Execute teste "Progressive Web App"

4. **Teste a instalação:**
   - Procure pelo ícone de instalação na barra de endereços
   - Ou use o banner que aparece automaticamente

**Veja o arquivo `TESTE_PWA_LOCAL.md` para mais detalhes sobre testes locais!**

### 📋 Como Instalar

#### No Desktop (Chrome/Edge):
1. Acesse o site
2. Clique no ícone de instalação na barra de endereços
3. Ou vá em Menu → "Instalar Kako Fin"

#### No Android (Chrome):
1. Acesse o site
2. Aparecerá um banner "Adicionar à tela inicial"
3. Ou vá em Menu → "Adicionar à tela inicial"

#### No iOS (Safari):
1. Acesse o site
2. Toque no botão de compartilhar
3. Selecione "Adicionar à Tela de Início"

## 🔧 Configurações Adicionais (Opcional)

### Atualizar Versão do Cache

Quando fizer atualizações importantes, atualize a versão do cache no `public/sw.js`:

```javascript
const CACHE_NAME = 'kako-fin-v1.0.1'; // Incrementar versão
```

### Adicionar Splash Screen (iOS)

Adicione no `index.html`:

```html
<link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px)">
```

### Notificações Push (Futuro)

O Service Worker já está preparado para receber notificações push. Para implementar:

1. Configure um servidor de push notifications
2. Registre o usuário para receber notificações
3. Envie notificações através do servidor

## 📝 Checklist de Deploy

- [ ] Criar todos os ícones necessários
- [ ] Colocar ícones na pasta `public/`
- [ ] Testar instalação no Chrome Desktop
- [ ] Testar instalação no Android
- [ ] Testar instalação no iOS
- [ ] Verificar funcionamento offline
- [ ] Testar atualizações do Service Worker

## 🐛 Troubleshooting

### PWA não aparece como instalável
- Verifique se está servindo via HTTPS (obrigatório para PWA)
- Verifique se o manifest.json está acessível
- Verifique se o service worker está registrado (Console do navegador)

### Ícones não aparecem
- Verifique se os arquivos estão na pasta `public/`
- Verifique se os caminhos no manifest.json estão corretos
- Limpe o cache do navegador

### Service Worker não registra
- Verifique o console do navegador para erros
- Certifique-se de que está servindo via HTTPS (ou localhost)
- Verifique se o arquivo `sw.js` está acessível em `/sw.js`

## 📚 Recursos

- [MDN - Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev - PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)

