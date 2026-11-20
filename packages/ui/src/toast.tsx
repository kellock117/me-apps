'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * 닫기 버튼(✕)으로만 닫히는 알림. 여러 개가 오면 쌓이고 각각 따로 닫는다.
 *
 * 서버 액션이 `redirect('/?toast=코드')`로 보내면, 이 컴포넌트가 코드에 맞는 문구를 띄우고
 * 주소에서 `toast` 값을 지운다(새로고침해도 다시 뜨지 않게).
 * 레이아웃에 두므로 화면을 옮겨도 닫지 않은 알림이 남는다(새로고침하면 사라진다). 타이머로는 사라지지 않는다.
 * 코드와 문구의 표는 앱마다 다르므로 `messages`로 받는다. useSearchParams를 쓰므로 <Suspense>로 감싸서 쓴다.
 *
 * @param messages 예: { saved: '저장했어요' }
 */
export function Toast({ messages }: { messages: Record<string, string> }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [items, setItems] = useState<{ id: number; text: string }[]>([]);
  const nextId = useRef(0);
  // 개발 모드(StrictMode)에서 효과가 두 번 돌아도 같은 코드로 알림이 두 개 쌓이지 않게, 이미 처리한 코드를 기억한다.
  const handled = useRef<string | null>(null);
  const code = params.get('toast');

  useEffect(() => {
    if (!code) {
      handled.current = null;
      return;
    }
    if (handled.current === code) return;
    handled.current = code;
    const text = messages[code];
    if (text) setItems((prev) => [...prev, { id: nextId.current++, text }]);
    const next = new URLSearchParams(params.toString());
    next.delete('toast');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-center gap-3 rounded-full bg-ink py-3 pl-5 pr-3 text-sm font-medium text-paper shadow-lg">
          <span>{t.text}</span>
          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="flex size-9 items-center justify-center rounded-full text-paper/70 hover:bg-paper/15 hover:text-paper"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
