/* eslint-disable no-undef */
// Service Worker para Firebase Cloud Messaging (Web Push) en Fidely Club
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAq201SVEzffh3ldD1ioKAyz7z4y_WNloQ",
  authDomain: "conecta2-drive.firebaseapp.com",
  projectId: "conecta2-drive",
  storageBucket: "conecta2-drive.firebasestorage.app",
  messagingSenderId: "967297739363",
  appId: "1:967297739363:web:5818c1d31c8361ecb26656"
});

const messaging = firebase.messaging();

// Notificaciones push recibidas en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificación push recibida en segundo plano:', payload);

  // IMPORTANTE: Cuando el payload de FCM ya incluye el bloque `notification` (o `webpush.notification`),
  // el SDK de Firebase Messaging muestra automáticamente la notificación nativa en el navegador.
  // Si llamamos también a `self.registration.showNotification(...)` aquí, el navegador muestra 2 notificaciones repetidas.
  if (payload && payload.notification) {
    return;
  }

  const data = payload?.data || {};
  const title = data.title || 'Fidely Club';
  const body = data.body || 'Tienes una nueva actualización en tu club de fidelización.';
  const icon = data.image_url || data.icon || '/fidely.png';

  const notificationOptions = {
    body: body,
    icon: icon,
    badge: '/favicon.svg',
    image: data.image_url,
    data: data,
    tag: data.promo_id || data.store_id || 'fideli_notification',
    renotify: false,
  };

  self.registration.showNotification(title, notificationOptions);
});

// Click en la notificación push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

