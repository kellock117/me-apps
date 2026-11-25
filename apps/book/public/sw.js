// 독서 앱 서비스 워커. 지금은 등록만 한다(오프라인 캐시 없음).
// 푸시(push)와 알림 누르기(notificationclick) 처리는 푸시 티켓에서 더한다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
