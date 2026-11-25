import { describe, expect, it } from 'vitest';
import { bookFieldsSchema, meetingSchema, recommendSchema, selectExistingSchema } from './book';

const ID = 'bbbbbbbb-7feb-80aa-8a1d-c67ae5804206';
const ok = {
  title: '데미안',
  authors: '헤르만 헤세',
  translators: '전영애',
  publisher: '민음사',
  publishedDate: '2009-01-20',
  isbn13: '9788937460449',
  pages: '448',
  genre: '소설',
  description: '',
  coverUrl: 'https://t1.daumcdn.net/lbook/image/540810',
  infoSource: 'kakao',
};

describe('bookFieldsSchema', () => {
  it('정상 입력', () => {
    expect(bookFieldsSchema.parse(ok)).toMatchObject({ title: '데미안', authors: ['헤르만 헤세'], isbn13: '9788937460449', pages: 448, genre: '소설', description: null });
  });
  it('쪽수는 필수: 비어 있으면 "쪽수를 입력해 주세요"', () => {
    const r = bookFieldsSchema.safeParse({ ...ok, pages: '' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('쪽수를 입력해 주세요');
    expect(bookFieldsSchema.safeParse({ ...ok, pages: '0' }).success).toBe(false);
    expect(bookFieldsSchema.safeParse({ ...ok, pages: '10001' }).success).toBe(false);
    expect(recommendSchema.safeParse({ ...ok, pages: '', reason: '좋아요' }).success).toBe(false);
  });
  it('장르는 필수: 비어 있거나 목록 밖이면 거부', () => {
    const r = bookFieldsSchema.safeParse({ ...ok, genre: '' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe('장르를 선택해 주세요');
    expect(bookFieldsSchema.safeParse({ ...ok, genre: '없는장르' }).success).toBe(false);
  });
  it('직접 입력은 제목, 쪽수, 장르만 있어도 된다', () => {
    const r = bookFieldsSchema.parse({ ...ok, authors: '', translators: '', publisher: '', publishedDate: '', isbn13: '', coverUrl: '', infoSource: 'manual' });
    expect(r).toMatchObject({ authors: [], isbn13: null, coverUrl: null, publishedDate: null });
  });
  it('ISBN·표지 주소·출처·날짜 검증', () => {
    expect(bookFieldsSchema.safeParse({ ...ok, isbn13: '123' }).success).toBe(false);
    expect(bookFieldsSchema.safeParse({ ...ok, coverUrl: 'https://evil.com/a.jpg' }).success).toBe(false);
    expect(bookFieldsSchema.safeParse({ ...ok, infoSource: 'aladin' }).success).toBe(false);
    expect(bookFieldsSchema.safeParse({ ...ok, publishedDate: '2009-13-40' }).success).toBe(false);
    expect(bookFieldsSchema.safeParse({ ...ok, title: ' ' }).success).toBe(false);
  });
});

describe('recommendSchema / selectExistingSchema', () => {
  it('추천 이유는 선택: 비우면 null', () => {
    expect(recommendSchema.parse({ ...ok, reason: '' }).reason).toBeNull();
    expect(recommendSchema.parse({ ...ok, reason: ' 좋아요 ' }).reason).toBe('좋아요');
  });
  it('선정: 책·선정자·날짜가 필요(이유는 선택)', () => {
    const base = { bookId: ID, selectedBy: ID, reason: '읽고 싶어서', date: '2026-12-08' };
    expect(selectExistingSchema.safeParse(base).success).toBe(true);
    expect(selectExistingSchema.safeParse({ ...base, date: '' }).success).toBe(false);
    expect(selectExistingSchema.parse({ ...base, reason: '' }).reason).toBeNull();
    expect(selectExistingSchema.safeParse({ ...base, bookId: 'x' }).success).toBe(false);
  });
});

describe('meetingSchema', () => {
  const base = { id: ID, date: '2026-12-08', questions: '', attendees: [ID], intent: 'save' };
  it('빈 질문은 null', () => {
    expect(meetingSchema.parse(base)).toMatchObject({ questions: null });
  });
  it('장소 칸은 없다(옛 폼이 place를 보내도 결과에 남지 않는다)', () => {
    expect(meetingSchema.parse({ ...base, place: '디스코드' })).not.toHaveProperty('place');
  });
  it('날짜·의도·참석자 id 검증', () => {
    expect(meetingSchema.safeParse({ ...base, date: '' }).success).toBe(false);
    expect(meetingSchema.safeParse({ ...base, intent: 'x' }).success).toBe(false);
    expect(meetingSchema.safeParse({ ...base, attendees: ['x'] }).success).toBe(false);
  });
});
