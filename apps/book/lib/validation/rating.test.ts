import { describe, expect, it } from 'vitest';
import { ratingInputSchema } from './rating';

const BOOK = 'bbbbbbbb-7feb-80aa-8a1d-c67ae5804206';
const base = { bookId: BOOK, score: '3.5', review: '좋았다', quotes: [] as string[] };

import { QUOTES_MAX_COUNT, QUOTE_MAX } from './rating';

describe('ratingInputSchema', () => {
  it('정상 입력: 문자열 별점을 숫자로', () => {
    const r = ratingInputSchema.parse(base);
    expect(r).toEqual({ bookId: BOOK, score: 3.5, review: '좋았다', quotes: [] });
  });
  it('0.5 단위가 아니면 거절 (0.7점)', () => {
    expect(ratingInputSchema.safeParse({ ...base, score: '0.7' }).success).toBe(false);
  });
  it('범위 밖이면 거절', () => {
    expect(ratingInputSchema.safeParse({ ...base, score: '0' }).success).toBe(false);
    expect(ratingInputSchema.safeParse({ ...base, score: '5.5' }).success).toBe(false);
  });
  it('경계값은 통과', () => {
    expect(ratingInputSchema.safeParse({ ...base, score: '0.5' }).success).toBe(true);
    expect(ratingInputSchema.safeParse({ ...base, score: '5' }).success).toBe(true);
  });
  it('별점이 비어 있으면 "골라 주세요" 메시지로 거절', () => {
    const empty = ratingInputSchema.safeParse({ ...base, score: '' });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0]?.message).toBe('별점을 골라 주세요');
    expect(ratingInputSchema.safeParse({ ...base, score: 'abc' }).success).toBe(false);
  });
  it('리뷰는 선택: 비워도(공백만 있어도) 저장되고 빈 문자열이 된다', () => {
    expect(ratingInputSchema.parse({ ...base, review: '' }).review).toBe('');
    expect(ratingInputSchema.parse({ ...base, review: '   \n ' }).review).toBe('');
  });
  it('리뷰는 앞뒤 공백을 자르고 줄바꿈은 그대로 둔다', () => {
    expect(ratingInputSchema.parse({ ...base, review: '  첫 줄\n둘째 줄  ' }).review).toBe('첫 줄\n둘째 줄');
  });
  it('브라우저가 보내는 \\r\\n 줄바꿈은 \\n 하나로 통일한다(입력칸의 글자 수와 맞추려고)', () => {
    expect(ratingInputSchema.parse({ ...base, review: '가\r\n나\r\n\r\n다' }).review).toBe('가\n나\n\n다');
    // 줄바꿈이 많아도 입력칸이 센 1000자는 통과한다
    expect(ratingInputSchema.safeParse({ ...base, review: 'a\r\n'.repeat(499) + 'a' }).success).toBe(true);
  });
  it('리뷰는 1000자까지', () => {
    expect(ratingInputSchema.safeParse({ ...base, review: 'a'.repeat(1000) }).success).toBe(true);
    const over = ratingInputSchema.safeParse({ ...base, review: 'a'.repeat(1001) });
    expect(over.success).toBe(false);
    if (!over.success) expect(over.error.issues[0]?.message).toBe('리뷰는 1000자까지예요');
  });
  it('책 ID가 uuid가 아니면 거절', () => {
    expect(ratingInputSchema.safeParse({ ...base, bookId: 'nope' }).success).toBe(false);
  });

  it('문장: 앞뒤 공백을 자르고 빈 칸은 건너뛰며 순서를 지킨다', () => {
    const r = ratingInputSchema.parse({ ...base, quotes: [' 첫째 ', '', '   ', '둘째'] });
    expect(r.quotes).toEqual(['첫째', '둘째']);
  });
  it('문장: 모두 비워도 통과(저장하면 내 문장이 모두 지워진다)', () => {
    expect(ratingInputSchema.parse({ ...base, quotes: ['', '  '] }).quotes).toEqual([]);
  });
  it('문장: 500자까지, 넘으면 거절', () => {
    expect(ratingInputSchema.safeParse({ ...base, quotes: ['a'.repeat(QUOTE_MAX)] }).success).toBe(true);
    const over = ratingInputSchema.safeParse({ ...base, quotes: ['a'.repeat(QUOTE_MAX + 1)] });
    expect(over.success).toBe(false);
    if (!over.success) expect(over.error.issues[0]?.message).toBe('인상 깊은 문장은 500자까지예요');
  });
  it('문장: \\r\\n은 \\n 하나로 센다', () => {
    expect(ratingInputSchema.parse({ ...base, quotes: ['가\r\n나'] }).quotes).toEqual(['가\n나']);
  });
  it('문장: 서버 안전장치로 50개까지(빈 칸은 세지 않는다)', () => {
    const fifty = Array.from({ length: QUOTES_MAX_COUNT }, (_, i) => `문장 ${i}`);
    expect(ratingInputSchema.safeParse({ ...base, quotes: [...fifty, '', ''] }).success).toBe(true);
    const over = ratingInputSchema.safeParse({ ...base, quotes: [...fifty, '하나 더'] });
    expect(over.success).toBe(false);
  });
});
