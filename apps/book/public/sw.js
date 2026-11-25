// 독서 앱 서비스 워커. 오프라인 캐시는 없다(홈 화면 설치와 푸시만 맡는다).
// 푸시 내용은 서버(lib/push/send.ts)가 { title, body, url } JSON으로 보낸다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // JSON이 아니면 아래 기본 문구를 쓴다
  }
  // iOS는 푸시를 받고 알림을 띄우지 않으면 구독을 끊을 수 있어서, 내용이 비어 있어도 늘 띄운다.
  event.waitUntil(
    self.registration.showNotification(data.title || '📚 독서 모임', {
      body: data.body || '',
      data: { url: typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') && !data.url.startsWith('/\\') ? data.url : '/' },
    }),
  );
});

// 알림을 누르면: 이미 열린 창이 있으면 그 창을 이동시키고, 없으면 새로 연다.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.focus().then((w) => (w || open).navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
