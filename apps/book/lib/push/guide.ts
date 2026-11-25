/**
 * 첫 접속 안내 결정(docs/book/features/push.md). 이 기기의 알림 상태와 "이미 닫았나"만 보고 지금 보일 안내를 하나 고른다.
 * 브라우저·저장소를 읽는 일은 호출하는 쪽(FirstRunGuide)이 하고, 여기는 순수 함수만 둔다(테스트 대상).
 * 게스트는 이 컴포넌트가 아예 그려지지 않으므로 여기서 다루지 않는다.
 */

import type { PushStatus } from './client';

/** 🔔의 "방법 보기"가 설치 안내를 다시 열 때 쏘는 창 이벤트 이름. */
export const OPEN_INSTALL_GUIDE = 'book:open-install-guide';

export type Guide = 'install' | 'ask';

/** 기기에 "닫았다/아니요 했다"를 적어 두는 localStorage 키. 기기마다 한 번씩 보인다. */
export const GUIDE_KEYS = { install: 'book:guide:install-dismissed', ask: 'book:guide:ask-dismissed' } as const;

/** 개발 서버에서만 쓰는 스위치(localStorage). 'off'면 개발 중에도 "닫았다" 기록을 따른다. 기본은 켜짐 = 기록을 무시하고 항상 띄움. */
export const DEV_ALWAYS_KEY = 'book:guide:dev-always';

/**
 * 모바일이 아니면 없음. 홈 화면에 추가 안 함(iPhone) → 설치 안내, 추가함 + 아직 안 켬 → 알림 안내창.
 * 켬·시스템에서 거절·지원 안 함·아직 모름(loading)이면 없음. 닫은 안내는 다시 자동으로 뜨지 않는다.
 */
export function decideGuide(status: PushStatus, dismissed: { install: boolean; ask: boolean }, mobile: boolean): Guide | null {
  if (!mobile) return null; // 데스크톱에서는 첫 접속 안내를 띄우지 않는다(🔔에서 직접 켤 수 있음)
  if (status === 'needs-install') return dismissed.install ? null : 'install';
  if (status === 'off') return dismissed.ask ? null : 'ask';
  return null;
}
