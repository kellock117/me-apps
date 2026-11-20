import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRateLimit, resetRateLimit } from './rate-limit';
import { safeNextPath } from './redirect';
import { isDevLoginSkip } from './dev-login';
import { verifySiteToken } from './site-lock';
import { createSessionToken, safeEqual, SESSION_MAX_AGE_SEC, verifySessionToken } from './session';

const NOW = Date.UTC(2026, 10, 10);

describe('세션 토큰', () => {
  it('만든 토큰은 같은 비밀번호로 검증된다', () => {
    expect(verifySessionToken(createSessionToken('pw', NOW), 'pw', NOW)).toBe(true);
  });
  it('다른 비밀번호, 변조, 형식 오류는 거절한다', () => {
    const t = createSessionToken('pw', NOW);
    expect(verifySessionToken(t, 'other', NOW)).toBe(false);
    const [exp, sig] = t.split('.');
    expect(verifySessionToken(`${Number(exp) + 99999}.${sig}`, 'pw', NOW)).toBe(false);
    expect(verifySessionToken('garbage', 'pw', NOW)).toBe(false);
    expect(verifySessionToken(`${exp}.${sig}.extra`, 'pw', NOW)).toBe(false);
    expect(verifySessionToken(undefined, 'pw', NOW)).toBe(false);
    expect(verifySessionToken(t, undefined, NOW)).toBe(false);
    expect(verifySessionToken(t, '', NOW)).toBe(false);
  });
  it('30일 뒤에는 만료된다', () => {
    const t = createSessionToken('pw', NOW);
    expect(verifySessionToken(t, 'pw', NOW + (SESSION_MAX_AGE_SEC - 5) * 1000)).toBe(true);
    expect(verifySessionToken(t, 'pw', NOW + (SESSION_MAX_AGE_SEC + 5) * 1000)).toBe(false);
  });
});

describe('safeEqual', () => {
  it('같으면 true, 길이가 달라도 오류 없이 false', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('', 'a')).toBe(false);
  });
});

describe('safeNextPath', () => {
  it('사이트 안 경로만 허용한다', () => {
    expect(safeNextPath('/rate?book=1')).toBe('/rate?book=1');
    expect(safeNextPath('https://evil.com')).toBe('/');
    expect(safeNextPath('//evil.com')).toBe('/');
    expect(safeNextPath('/\\evil.com')).toBe('/');
    expect(safeNextPath('/login')).toBe('/');
    expect(safeNextPath(null)).toBe('/');
    expect(safeNextPath('')).toBe('/');
  });
});

describe('checkRateLimit', () => {
  beforeEach(resetRateLimit);
  const opt = { limit: 3, windowMs: 600_000 };
  it('한도까지 통과하고 넘으면 막는다', () => {
    for (let i = 0; i < 3; i++) expect(checkRateLimit('ip1', opt, NOW + i).ok).toBe(true);
    const r = checkRateLimit('ip1', opt, NOW + 10);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.retryAfterMs).toBeGreaterThan(0);
  });
  it('IP마다 따로 센다', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('ip1', opt, NOW);
    expect(checkRateLimit('ip2', opt, NOW).ok).toBe(true);
  });
  it('창이 지나면 다시 허용한다', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('ip1', opt, NOW);
    expect(checkRateLimit('ip1', opt, NOW + 600_001).ok).toBe(true);
  });
});

describe('개발 모드 로그인 생략', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('next dev(development)에서만 켜진다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(isDevLoginSkip()).toBe(true);
    for (const env of ['production', 'test']) {
      vi.stubEnv('NODE_ENV', env);
      expect(isDevLoginSkip()).toBe(false);
    }
  });
  it('개발 모드에서는 쿠키·비밀번호가 없어도 앱 잠금을 통과한다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(verifySiteToken('workout', undefined, undefined)).toBe(true);
  });
  it('production에서는 쿠키가 없거나 비밀번호가 없으면 막힌다', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(verifySiteToken('workout', undefined, 'pw')).toBe(false);
    expect(verifySiteToken('workout', createSiteTokenFor('pw'), undefined)).toBe(false);
    expect(verifySiteToken('workout', createSiteTokenFor('pw'), 'pw')).toBe(true);
  });
});

import { createSiteToken } from './site-lock';
const createSiteTokenFor = (pw: string) => createSiteToken('workout', pw);
