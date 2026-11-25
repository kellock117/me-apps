'use client';

import { useEffect, useState, useTransition } from 'react';
import { removePushSubscription, savePushSubscription } from '@/app/(main)/push-actions';

/** 이 기기의 알림 상태. loading은 첫 그림(서버)에서 브라우저를 아직 못 본 때다. */
type Status = 'loading' | 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on';

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
async function readStatus(savedEndpoints: string[]): Promise<Status> {
  if (isIos() && !isStandalone()) return 'needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
  return sub && savedEndpoints.includes(sub.endpoint) ? 'on' : 'off';
}

/**
 * 🔔 드롭다운 맨 아래 한 줄: 이 기기의 알림을 켜고 끈다(docs/features/push.md).
 * 켜짐 = 이 기기의 브라우저 구독이 있고, 그 주소가 지금 멤버 이름으로 저장되어 있을 때(savedEndpoints는 서버가 지금 멤버 기준으로 넘긴다).
 * 권한 요청은 [켜기]를 눌렀을 때만 한다(iOS는 사용자 동작 안에서만 허용). 끄기는 서버 저장만 지우고 브라우저 구독은 둔다 —
 * 같은 기기에서 다른 멤버도 켜 두었을 수 있어서, 브라우저 구독을 풀면 그 멤버 알림이 죽는다.
 */
export function PushToggle({ publicKey, savedEndpoints }: { publicKey: string; savedEndpoints: string[] }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    readStatus(savedEndpoints).then(
      (s) => alive && setStatus(s),
      () => alive && setStatus('unsupported'),
    );
    return () => {
      alive = false;
    };
  }, [savedEndpoints]);

  const enable = () =>
    start(async () => {
      setError(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return setStatus(permission === 'denied' ? 'denied' : 'off');
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
        const res = await savePushSubscription(sub.toJSON());
        if (res.ok) setStatus('on');
        else setError(res.error);
      } catch {
        setError('알림을 켜지 못했어요. 잠시 뒤에 다시 해 주세요');
      }
    });

  const disable = () =>
    start(async () => {
      setError(null);
      try {
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        if (sub) {
          const res = await removePushSubscription({ endpoint: sub.endpoint });
          if (!res.ok) return setError(res.error);
        }
        setStatus('off');
      } catch {
        setError('알림을 끄지 못했어요. 잠시 뒤에 다시 해 주세요');
      }
    });

  if (status === 'loading') return null;
  const note = 'px-3 py-3 text-sm text-muted';
  return (
    <div className="border-t border-line">
      {status === 'unsupported' && <p className={note}>이 브라우저는 알림을 받을 수 없어요</p>}
      {status === 'needs-install' && <p className={note}>공유 → 홈 화면에 추가 후 켤 수 있어요</p>}
      {status === 'denied' && <p className={note}>설정에서 알림을 허용해 주세요</p>}
      {status === 'off' && (
        <button type="button" disabled={pending} onClick={enable} className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium text-accent disabled:opacity-60">
          이 기기에서 알림 켜기
        </button>
      )}
      {status === 'on' && (
        <div className="flex items-center justify-between gap-2 px-3">
          <p className="py-3 text-sm text-muted">이 기기에서 알림을 받아요</p>
          <button type="button" disabled={pending} onClick={disable} className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-muted disabled:opacity-60">
            끄기
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="px-3 pb-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
