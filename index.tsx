
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Tentar registrar o service worker
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker registrado com sucesso:', registration.scope);
        
        // Verificar atualizações a cada hora
        setInterval(() => {
          registration.update();
        }, 3600000);
        
        // Verificar atualizações quando a página ganha foco
        window.addEventListener('focus', () => {
          registration.update();
        });
      })
      .catch((error) => {
        // Silenciar erro se o arquivo não existir (desenvolvimento)
        if (error.message?.includes('Failed to register')) {
          console.log('ℹ️ Service Worker não encontrado (normal em desenvolvimento)');
        } else {
          console.warn('⚠️ Erro ao registrar Service Worker:', error);
        }
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
