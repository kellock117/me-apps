import { describe, expect, it } from 'vitest';
import { dismissKeySchema, dismissKeysSchema } from './notice';

const BOOK = '44444444-4444-4444-8444-444444444444';

describe('dismissKeySchema: 숨길 수 있는 알림 키', () => {
  it('진도 키는 받는다', () => {
    expect(dismissKeySchema.safeParse(`progress:${BOOK}:2`).success).toBe(true);
  });

  it('평점 키는 거절한다(평점 알림은 숨길 수 없다)', () => {
    expect(dismissKeySchema.safeParse(`rate:${BOOK}`).success).toBe(false);
  });

  it('모양이 틀린 키는 거절한다', () => {
    for (const bad of ['', 'progress', `progress:${BOOK}`, `progress:${BOOK}:`, `progress:${BOOK}:0`, `progress:${BOOK}:x`, `progress:not-a-uuid:2`, `progress:${BOOK}:2:extra`, ` progress:${BOOK}:2`]) {
      expect(dismissKeySchema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('dismissKeysSchema: 모두 읽음', () => {
  it('진도 키 여러 개를 받는다', () => {
    expect(dismissKeysSchema.safeParse([`progress:${BOOK}:1`, `progress:${BOOK}:2`]).success).toBe(true);
  });

  it('빈 목록이나 평점 키가 섞이면 거절한다', () => {
    expect(dismissKeysSchema.safeParse([]).success).toBe(false);
    expect(dismissKeysSchema.safeParse([`progress:${BOOK}:1`, `rate:${BOOK}`]).success).toBe(false);
  });
});
