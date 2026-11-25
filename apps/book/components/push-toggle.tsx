'use client';

import { useEffect, useState, useTransition } from 'react';
import { removePushSubscription } from '@/app/(main)/push-actions';
import { enablePush, readPushStatus, type PushStatus } from '@/lib/push/client';
import { OPEN_INSTALL_GUIDE } from '@/lib/push/guide';

/**
 * 🔔 드롭다운 맨 아래 한 줄: 이 기기의 알림을 켜고 끈다(docs/book/features/push.md).
 * 켜짐 = 이 기기의 브라우저 구독이 있고, 그 주소가 지금 멤버 이름으로 저장되어 있을 때(savedEndpoints는 서버가 지금 멤버 기준으로 넘긴다).
 * 권한 요청은 [켜기]를 눌렀을 때만 한다(iOS는 사용자 동작 안에서만 허용). 끄기는 서버 저장만 지우고 브라우저 구독은 둔다 —
 * 같은 기기에서 다른 멤버도 켜 두었을 수 있어서, 브라우저 구독을 풀면 그 멤버 알림이 죽는다.
 */
export function PushToggle({ publicKey, savedEndpoints }: { publicKey: string; savedEndpoints: string[] }) {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    readPushStatus(savedEndpoints).then(
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
      const res = await enablePush(publicKey);
      if ('error' in res) setError(res.error);
      else setStatus(res.status);
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
      {status === 'needs-install' && (
        <div className="flex items-center justify-between gap-2 px-3">
          <p className="py-3 text-sm text-muted">홈 화면에 추가하면 알림을 켤 수 있어요</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_INSTALL_GUIDE))} className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium text-accent">
            방법 보기
          </button>
        </div>
      )}
      {status === 'denied' && <p className={note}>알림이 꺼져 있어요. iPhone 설정 → 알림 → 이 앱에서 켜 주세요</p>}
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
