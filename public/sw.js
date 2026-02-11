// Service Worker para Kako Fin PWA
const CACHE_NAME = "kako-fin-v1.0.2";
const urlsToCache = [
  "/",
  "/index.html",
  "/index.css",
  "/index.tsx",
  "/manifest.json",
];

// Instalar Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Cache aberto");
        // Tentar adicionar arquivos ao cache, mas não falhar se alguns não existirem
        return Promise.allSettled(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`⚠️ Não foi possível fazer cache de ${url}:`, err);
              return null;
            }),
          ),
        );
      })
      .catch((error) => {
        console.error("❌ Erro ao fazer cache:", error);
      }),
  );
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("🗑️ Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  return self.clients.claim();
});

// Interceptar requisições
self.addEventListener("fetch", (event) => {
  // Estratégia: Network First, fallback para Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar a resposta antes de armazenar no cache
        const responseToCache = response.clone();

        // Armazenar no cache apenas requisições GET bem-sucedidas
        if (event.request.method === "GET" && response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return response;
      })
      .catch(() => {
        // Se a rede falhar, tentar buscar do cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Se não encontrar no cache, retornar página offline se for navegação
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }
        });
      }),
  );
});

// Notificações push (opcional - para implementação futura)
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Kako Fin";
  const options = {
    body: data.body || "Você tem uma nova notificação",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique em notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
