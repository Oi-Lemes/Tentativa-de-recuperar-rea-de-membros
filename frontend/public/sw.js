// Este é um Service Worker básico para permitir a instalação do PWA.

self.addEventListener('install', (event) => {
  console.log('Service Worker: A instalar...');
  // Força o novo service worker a ativar-se
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativo.');
  // Toma controlo de todas as páginas abertas
  event.waitUntil(self.clients.claim());
});

// O navegador exige um "fetch handler" para considerar a app instalável.
// Este é o mais simples possível: apenas passa o pedido para a rede.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});