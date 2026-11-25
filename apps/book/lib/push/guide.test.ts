import { describe, expect, it } from 'vitest';
import { decideGuide } from './guide';

const none = { install: false, ask: false };

describe('decideGuide · 첫 접속 안내', () => {
  it('홈 화면에 추가 안 했으면 설치 안내', () => {
    expect(decideGuide('needs-install', none, true)).toBe('install');
  });

  it('추가했고 아직 안 켰으면 알림 안내창', () => {
    expect(decideGuide('off', none, true)).toBe('ask');
  });

  it('이미 켰거나, 시스템에서 거절했거나, 지원하지 않거나, 아직 모르면 없음', () => {
    for (const s of ['on', 'denied', 'unsupported', 'loading'] as const) expect(decideGuide(s, none, true)).toBeNull();
  });

  it('닫은 안내는 다시 뜨지 않는다(안내마다 따로)', () => {
    expect(decideGuide('needs-install', { install: true, ask: false }, true)).toBeNull();
    expect(decideGuide('off', { install: false, ask: true }, true)).toBeNull();
    expect(decideGuide('needs-install', { install: false, ask: true }, true)).toBe('install');
    expect(decideGuide('off', { install: true, ask: false }, true)).toBe('ask');
  });

  it('모바일이 아니면 어떤 상태여도 없음', () => {
    for (const s of ['needs-install', 'off'] as const) expect(decideGuide(s, none, false)).toBeNull();
  });
});
