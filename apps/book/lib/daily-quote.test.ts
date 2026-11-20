import { describe, expect, it } from 'vitest';
import { nextQuoteId, quoteIdForDay } from './daily-quote';

const IDS = ['q-d', 'q-a', 'q-c', 'q-b'];

describe('quoteIdForDay (오늘의 문장)', () => {
  it('같은 날짜면 목록 순서와 상관없이 같은 문장이다', () => {
    const a = quoteIdForDay(IDS, '2026-11-20');
    expect(a).toBe(quoteIdForDay([...IDS].reverse(), '2026-11-20'));
    expect(IDS).toContain(a);
  });
  it('날짜가 바뀌면 달라질 수 있다(여러 날 중 하나라도 다르다)', () => {
    const days = Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    expect(new Set(days.map((d) => quoteIdForDay(IDS, d))).size).toBeGreaterThan(1);
  });
  it('문장이 없으면 null, 하나면 그것', () => {
    expect(quoteIdForDay([], '2026-11-20')).toBeNull();
    expect(quoteIdForDay(['only'], '2026-11-20')).toBe('only');
  });
});

describe('nextQuoteId (다른 문장 보기)', () => {
  it('아직 안 본 문장 중에서 고른다', () => {
    const seen = ['q-a', 'q-b'];
    for (const r of [0, 0.4, 0.99]) {
      expect(['q-c', 'q-d']).toContain(nextQuoteId(IDS, seen, () => r)?.id);
    }
  });
  it('무작위 값에 따라 안 본 문장 사이에서 고른다', () => {
    const seen = ['q-a'];
    const picked = new Set([0, 0.5, 0.99].map((r) => nextQuoteId(IDS, seen, () => r)!.id));
    expect(picked.size).toBeGreaterThan(1);
    expect(picked.has('q-a')).toBe(false);
  });
  it('다 봤으면 처음부터 돈다: 안 본 것이 없으면 seen을 비우고 다시 시작한다', () => {
    const r = nextQuoteId(IDS, ['q-a', 'q-b', 'q-c', 'q-d'], () => 0);
    expect(r).toEqual({ id: expect.any(String), restarted: true });
  });
  it('처음부터 다시 돌 때는 방금 본 문장(seen의 마지막)을 피한다', () => {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      expect(nextQuoteId(['q-a', 'q-b'], ['q-b', 'q-a'], () => r)).toEqual({ id: 'q-b', restarted: true });
    }
    expect(nextQuoteId(['only'], ['only'], () => 0)).toEqual({ id: 'only', restarted: true });
  });
  it('지워진 문장이 seen에 남아 있어도 무시한다', () => {
    expect(nextQuoteId(['q-a', 'q-b'], ['gone', 'q-a'], () => 0)).toEqual({ id: 'q-b', restarted: false });
  });
  it('문장이 없으면 null', () => {
    expect(nextQuoteId([], [], () => 0)).toBeNull();
  });
});
