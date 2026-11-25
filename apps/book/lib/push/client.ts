/**
 * 브라우저(클라이언트)에서 이 기기의 알림 상태를 읽고 구독하는 도우미. 🔔 안의 켜기 줄(PushToggle)과 첫 접속 안내(FirstRunGuide)가 같이 쓴다.
 * 브라우저 API에 기대므로 서버에서 부르지 않는다. 권한 요청은 반드시 사용자 동작(누름) 안에서 부른다(iOS 규칙).
 */

import { savePushSubscription } from '@/app/(main)/push-actions';

/** 이 기기의 알림 상태. loading은 첫 그림(서버)에서 브라우저를 아직 못 본 때다. */
export type PushStatus = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** VAPID 공개 키(base64url)를 구독 요청이 받는 바이트로 바꾼다. */
function keyToBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** 이 기기가 어떤 상태인지 브라우저에 물어 본다. iOS는 홈 화면 앱이 아니면 푸시 API 자체가 없어서 "지원 안 함"보다 먼저 가른다. */
export async function readPushStatus(savedEndpoints: string[]): Promise<PushStatus> {
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
  return sub && savedEndpoints.includes(sub.endpoint) ? 'on' : 'off';
}

/**
 * 시스템 허용 창을 띄우고, 허용하면 구독해서 서버에 저장한다. 결과는 새 상태 또는 에러 문구.
 * 사용자 동작 안에서만 부른다.
 */
export async function enablePush(publicKey: string): Promise<{ status: PushStatus } | { error: string }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { status: permission === 'denied' ? 'denied' : 'off' };
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
    const res = await savePushSubscription(sub.toJSON());
    return res.ok ? { status: 'on' } : { error: res.error };
  } catch {
    return { error: '알림을 켜지 못했어요. 잠시 뒤에 다시 해 주세요' };
  }
}
