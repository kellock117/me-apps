'use client';

import { useEffect } from 'react';

/** 로그인한 화면에서 서비스 워커(/sw.js)를 한 번 등록한다. 지원하지 않는 브라우저에서는 아무 일도 하지 않는다. */
export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // 등록 실패는 앱 사용에 영향이 없다(푸시만 못 받음)
    });
  }, []);
  return null;
}
