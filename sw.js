// sw.js
const CACHE_NAME = 'iss-app-v4.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// URLs externas que precisamos fazer cache
const externalUrlsToCache = [
  'https://raw.githubusercontent.com/Reblix/dados-iss/main/xl/media/image1.png',
  'https://raw.githubusercontent.com/Reblix/dados-iss/main/xl/media/image2.png',
  'https://raw.githubusercontent.com/Reblix/dados-iss/main/xl/media/image3.png',
  'https://raw.githubusercontent.com/Reblix/dados-iss/main/logo.png',
  'https://raw.githubusercontent.com/Reblix/dados-iss/main/media/logo.png'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando arquivos essenciais');
        
        // Cache dos arquivos locais
        const localCachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            console.log(`Falha ao cachear ${url}:`, error);
          });
        });
        
        // Cache das URLs externas (logos)
        const externalCachePromises = externalUrlsToCache.map(url => {
          return fetch(url)
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
              throw new Error(`HTTP ${response.status} for ${url}`);
            })
            .catch(error => {
              console.log(`Falha ao cachear logo externo ${url}:`, error);
            });
        });
        
        return Promise.all([...localCachePromises, ...externalCachePromises]);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída');
        return self.skipWaiting();
      })
      .catch(error => {
        console.log('Service Worker: Erro na instalação', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativado');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativação concluída');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Para requisições de mesma origem e para as URLs externas de logo
  if (url.origin === self.location.origin || externalUrlsToCache.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se disponível
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Faz requisição da rede
          return fetch(event.request)
            .then(response => {
              // Verifica se é uma resposta válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Clona a resposta para adicionar ao cache
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
              
              return response;
            })
            .catch(error => {
              console.log('Fetch failed; returning offline page instead.', error);
              // Fallback para página offline
              if (event.request.destination === 'document') {
                return caches.match('./index.html');
              }
              return new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              });
            });
        })
    );
  }
});