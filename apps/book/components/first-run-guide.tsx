'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { enablePush, isMobile, readPushStatus } from '@/lib/push/client';
import { decideGuide, DEV_ALWAYS_KEY, GUIDE_KEYS, OPEN_INSTALL_GUIDE, type Guide } from '@/lib/push/guide';

/** 단계별 설치 사진(public/guide). 설명 그림(SVG). 실제 iPhone 화면 사진으로 바꿔도 된다(파일만 교체). */
const INSTALL_STEPS = [
  { image: '/guide/install-1.svg', title: '아래의 공유 버튼을 눌러요', body: 'Safari 화면 맨 아래에 있는 네모에 화살표가 있는 모양이에요.' },
  { image: '/guide/install-2.svg', title: '"홈 화면에 추가"를 골라요', body: '목록을 위로 밀면 보여요.' },
  { image: '/guide/install-3.svg', title: '오른쪽 위 "추가"를 눌러요', body: '홈 화면에 생긴 아이콘으로 다시 열면 끝이에요.' },
];

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};
const devAlwaysOff = () => {
  try {
    return localStorage.getItem(DEV_ALWAYS_KEY) === 'off';
  } catch {
    return false;
  }
};
const mark = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 등)에서는 다음에 또 보일 뿐이다
  }
};

/**
 * 첫 접속 안내(docs/features/push.md). 로그인한 멤버 레이아웃에만 그린다(게스트는 그리지 않는다).
 * 이 기기의 알림 상태를 읽어 설치 안내(홈 화면에 추가 전) 또는 알림 안내창(추가 후 아직 안 켬) 중 하나만 모달로 띄운다.
 * 닫거나 "아니요"를 누르면 이 기기(localStorage)에 적어 두고 다시 자동으로 띄우지 않는다. 🔔의 "방법 보기"는 설치 안내를 다시 연다.
 * 권한 요청은 [알림 켜기]를 누른 동작 안에서만 한다(iOS는 사용자 동작 없이 시스템 창을 못 띄운다).
 */
export function FirstRunGuide({ publicKey, savedEndpoints }: { publicKey: string; savedEndpoints: string[] }) {
  const endpointsKey = savedEndpoints.join('|');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [declined, setDeclined] = useState(false); // 알림 안내창에서 "아니요"를 눌러 다음 안내 문구를 보이는 중
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let alive = true;
    readPushStatus(savedEndpoints).then(
      (s) => {
        // 개발 서버에서는 관리 화면 스위치가 꺼지지 않는 한 "닫았다" 기록을 무시하고 항상 띄운다(운영 빌드에서는 이 줄이 빠진다)
        const always = process.env.NODE_ENV !== 'production' && !devAlwaysOff();
        if (alive) setGuide(decideGuide(s, always ? { install: false, ask: false } : { install: read(GUIDE_KEYS.install), ask: read(GUIDE_KEYS.ask) }, isMobile()));
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  // 레이아웃이 다시 그려질 때마다 savedEndpoints는 내용이 같아도 새 배열이라, 값(문자열)으로 비교해 내용이 바뀔 때만 다시 판정한다
  }, [endpointsKey]);

  useEffect(() => {
    const reopen = () => setGuide('install');
    window.addEventListener(OPEN_INSTALL_GUIDE, reopen);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, reopen);
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (guide && el && !el.open) el.showModal();
  }, [guide]);

  // 열릴 때 포커스를 모달 안 제목에 두고(스크롤 없이) 모달 스크롤을 맨 위로 둔다. 포커스가 맨 아래 버튼이나 모달 밖으로 가면 거기로 스크롤된다.
  const place = (el: HTMLDialogElement | null) => {
    dialog.current = el;
    if (!el) return;
    requestAnimationFrame(() => {
      // 다른 모달(할 일 등)이 이미 떠 있으면 그 아래에 깔리므로, 닫았다 다시 열어 맨 위로 올린다(close 이벤트는 비동기라 플래그로는 못 거른다. onClose에서 다시 열려 있는지 본다)
      if (document.querySelector('dialog[open]:not([data-first-run])')) {
        el.close();
        el.showModal();
      }
      el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      el.scrollTop = 0;
    });
  };

  const close = () => {
    if (guide === 'install') mark(GUIDE_KEYS.install);
    if (guide === 'ask') mark(GUIDE_KEYS.ask);
    dialog.current?.close();
    setGuide(null);
    setDeclined(false);
    setMessage(null);
  };

  const allow = () =>
    start(async () => {
      setMessage(null);
      const res = await enablePush(publicKey);
      if ('error' in res) return setMessage(res.error);
      if (res.status === 'denied') {
        mark(GUIDE_KEYS.ask);
        return setMessage('알림이 꺼진 채로 남았어요. 나중에 켜려면 iPhone 설정 → 알림 → 이 앱에서 켜 주세요');
      }
      close();
    });

  if (!guide) return null;
  const btn = 'flex min-h-12 w-full items-center justify-center rounded-xl px-4 font-semibold disabled:opacity-60';
  return (
    <dialog
      ref={place}
      aria-labelledby="first-run-title"
      data-first-run
      onClose={(e) => guide && !e.currentTarget.open && close()}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink backdrop:bg-black/50"
    >
      {guide === 'ask' ? (
        <div className="space-y-4 p-5">
          <h2 id="first-run-title" tabIndex={-1} className="font-serif outline-none text-lg font-bold">
            {declined ? '나중에 켜고 싶으면' : '푸시 알림을 허용해 주세요'}
          </h2>
          {declined ? (
            <>
              <p className="text-sm text-muted">화면 위쪽의 🔔 아이콘을 누르면 맨 아래에 "이 기기에서 알림 켜기"가 있어요. 언제든 켤 수 있어요.</p>
              <button type="button" onClick={close} className={`${btn} bg-accent text-accent-ink`}>
                알겠어요
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">알림을 켜면 앱을 열지 않아도 다음을 알려 드려요.</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                <li>이번 주 진도와 별점 마감이 다가올 때</li>
                <li>오늘이 모임 날일 때</li>
                <li>다음 모임이 정해지거나 날짜가 바뀔 때</li>
              </ul>
              {message && (
                <p role="alert" className="text-sm text-danger">
                  {message}
                </p>
              )}
              {message ? (
                <button type="button" onClick={close} className={`${btn} bg-accent text-accent-ink`}>
                  닫기
                </button>
              ) : (
                <div className="space-y-2">
                  <button type="button" disabled={pending} onClick={allow} className={`${btn} bg-accent text-accent-ink`}>
                    알림 켜기
                  </button>
                  <button type="button" disabled={pending} onClick={() => (mark(GUIDE_KEYS.ask), setDeclined(true))} className={`${btn} text-muted`}>
                    아니요
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <h2 id="first-run-title" tabIndex={-1} className="font-serif outline-none text-lg font-bold">
            홈 화면에 추가해 주세요
          </h2>
          <div className="rounded-xl bg-accent/10 p-3 text-sm">
            <p className="font-semibold">왜 추가하나요?</p>
            <p className="mt-1 text-muted">iPhone은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요. 추가하면 진도·별점 마감, 모임 날짜를 앱을 열지 않아도 알려 드려요. 앱처럼 바로 열리는 것은 덤이에요.</p>
          </div>
          <ol className="space-y-5">
            {INSTALL_STEPS.map((step, i) => (
              <li key={step.image} className="space-y-2">
                <p className="text-sm font-semibold">
                  {i + 1}. {step.title}
                </p>
                <p className="text-sm text-muted">{step.body}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={step.image} alt={`${i + 1}단계: ${step.title}`} width={280} height={400} loading="lazy" onError={(e) => (e.currentTarget.hidden = true)} className="mx-auto max-h-96 w-auto rounded-xl border border-line" />
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted">추가한 뒤에는 홈 화면의 아이콘으로 열어 주세요. 그러면 알림을 켜 달라고 물어봐요.</p>
          <button type="button" onClick={close} className={`${btn} bg-accent text-accent-ink`}>
            알겠어요
          </button>
        </div>
      )}
    </dialog>
  );
}
