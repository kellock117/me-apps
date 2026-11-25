import { describe, expect, it } from 'vitest';
import { todayInSeoul } from '@me/core/date';
import { planPushes, type PlanInput } from './plan';

// 모임: 앞 모임 11/15(일), 다음 모임 12/13(일). 주차 마감일(보내는 날): 11/22, 11/29, 12/06, 12/12(모임 전날).
const A = 'member-a';
const B = 'member-b';
const C = 'member-c'; // 활동 아님

const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  kind: { type: 'daily' },
  today: '2026-11-29',
  members: [
    { id: A, name: 'A', rotationOrder: 1, status: 'active' },
    { id: B, name: 'B', rotationOrder: 2, status: 'active' },
    { id: C, name: 'C', rotationOrder: 3, status: 'pending' },
  ],
  books: [
    { id: 'old', title: '옛 책', pages: 200, status: 'done', selectedBy: null },
    { id: 'done', title: '끝낸 책', pages: 200, status: 'done', selectedBy: null },
    { id: 'now', title: '읽는 책', pages: 300, status: 'reading', selectedBy: null },
  ],
  meetings: [
    { id: 'm0', number: 1, date: '2026-10-18', bookId: 'old' },
    { id: 'm1', number: 2, date: '2026-11-15', bookId: 'done' },
    { id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' },
  ],
  // A는 둘 다 끝냄(별점 + 진도), B는 아무것도 안 함
  ratings: [
    { bookId: 'old', memberId: A, score: 4 },
    { bookId: 'done', memberId: A, score: 4 },
    { bookId: 'old', memberId: B, score: 3 },
    { bookId: 'done', memberId: B, score: 3 },
    { bookId: 'old', memberId: C, score: 3 },
    { bookId: 'done', memberId: C, score: 3 },
  ],
  progress: [{ bookId: 'now', memberId: A, week: 2 }],
  dismissed: {},
  sent: [],
  ...over,
});

const forMember = (pushes: ReturnType<typeof planPushes>, id: string) => pushes.find((p) => p.memberId === id);

describe('planPushes · 주차 알림 날짜', () => {
  it('주차 마감일에 활동 멤버에게만 보낸다', () => {
    const pushes = planPushes(base());
    expect(pushes.map((p) => p.memberId).sort()).toEqual([A, B]);
    expect(pushes[0]!.key).toBe('weekly:m2:2026-11-29');
    expect(pushes[0]!.title).toBe('📚 모임까지 D-14 · 12월 13일(일)');
  });

  it('주차 마감일이 아닌 날에는 없다', () => {
    expect(planPushes(base({ today: '2026-11-30' }))).toEqual([]);
    expect(planPushes(base({ today: '2026-11-28' }))).toEqual([]);
  });

  it('모임 전날(마지막 주차 마감일)은 D-1 제목이다', () => {
    const [p] = planPushes(base({ today: '2026-12-12' }));
    expect(p!.title).toBe('📚 내일 모임이에요 (D-1) · 12월 13일(일)');
    expect(p!.key).toBe('weekly:m2:2026-12-12');
  });

  it('주차 마감일과 모임 전날이 이틀 연속이면 둘 다 보낸다', () => {
    const meetings = [
      { id: 'm1', number: 2, date: '2026-11-16', bookId: 'done' },
      { id: 'm2', number: 3, date: '2026-12-16', bookId: 'now' },
    ];
    // 앞 모임 11/16 → 4주차 마감 12/14, 모임 전날 12/15
    const d14 = planPushes(base({ meetings, today: '2026-12-14' }));
    const d15 = planPushes(base({ meetings, today: '2026-12-15' }));
    expect(d14).toHaveLength(2);
    expect(d14[0]!.title).toBe('📚 모임까지 D-2 · 12월 16일(수)');
    expect(d15).toHaveLength(2);
    expect(d15[0]!.title).toBe('📚 내일 모임이에요 (D-1) · 12월 16일(수)');
  });

  it('다음 모임이 없으면 없다', () => {
    const meetings = base().meetings.filter((m) => m.id !== 'm2');
    expect(planPushes(base({ meetings, today: '2026-11-29' }))).toEqual([]);
  });

  it('첫 책(앞 모임 없음)이면 없다', () => {
    const meetings = [{ id: 'm2', number: 1, date: '2026-12-13', bookId: 'now' }];
    expect(planPushes(base({ meetings, today: '2026-11-29' }))).toEqual([]);
  });

  it('모임 날짜가 바뀌면 바뀐 일정으로 계산한다', () => {
    const meetings = base().meetings.map((m) => (m.id === 'm2' ? { ...m, date: '2026-12-20' } : m));
    // 12/20 모임: 마감일 11/22, 11/29, 12/06, 12/13, 12/19
    expect(planPushes(base({ meetings, today: '2026-12-13' }))[0]!.title).toBe('📚 모임까지 D-7 · 12월 20일(일)');
    expect(planPushes(base({ meetings, today: '2026-12-12' }))).toEqual([]);
    expect(planPushes(base({ meetings, today: '2026-12-19' }))[0]!.title).toBe('📚 내일 모임이에요 (D-1) · 12월 20일(일)');
  });

  it('서울 날짜 기준으로 판단한다(18시 KST 크론은 보내고, 자정 넘은 시각은 다음 날로 센다)', () => {
    const at = (iso: string) => planPushes(base({ today: todayInSeoul(new Date(iso)) }));
    expect(at('2026-11-29T09:00:00Z')).toHaveLength(2); // 11/29 18:00 KST
    expect(at('2026-11-29T15:30:00Z')).toEqual([]); // 11/30 00:30 KST
  });
});

describe('planPushes · 본문 다섯 모양과 이동', () => {
  it('할 일이 없으면 응원 문장, 홈(모달 없음)', () => {
    const p = forMember(planPushes(base()), A)!;
    expect(p.body).toBe('진도·별점 다 적었어요. 이번 주도 함께 읽어요');
    expect(p.url).toBe('/');
  });

  it('진도만: 그 책 상세로', () => {
    const p = forMember(planPushes(base({ progress: [] })), A)!;
    expect(p.body).toBe('『읽는 책』 2주차 진도를 아직 안 적었어요');
    expect(p.url).toBe('/books/now');
  });

  it('별점만: 그 책 평점 화면으로', () => {
    const ratings = base().ratings.filter((r) => !(r.memberId === A && r.bookId === 'done'));
    const p = forMember(planPushes(base({ ratings })), A)!;
    expect(p.body).toBe('『끝낸 책』 별점을 아직 안 남겼어요');
    expect(p.url).toBe('/rate?book=done');
  });

  it('별점 2권 이상이면 "외 n권", 홈에서 할 일 모달 강제', () => {
    const ratings = base().ratings.filter((r) => r.memberId !== A);
    const p = forMember(planPushes(base({ ratings })), A)!;
    expect(p.body).toBe('『끝낸 책』 외 1권 별점을 아직 안 남겼어요'); // 모임 날짜가 늦은 책이 앞
    expect(p.url).toBe('/?todo=1');
  });

  it('진도와 별점이 둘 다면 한 문장, 홈에서 할 일 모달 강제', () => {
    const ratings = base().ratings.filter((r) => !(r.memberId === B && r.bookId === 'done'));
    const p = forMember(planPushes(base({ ratings })), B)!;
    expect(p.body).toBe('『읽는 책』 2주차 진도와 『끝낸 책』 별점을 아직 안 남겼어요');
    expect(p.url).toBe('/?todo=1');
  });

  it('숨긴(읽음) 진도는 본문에서 뺀다', () => {
    const p = forMember(planPushes(base({ dismissed: { [B]: ['progress:now:2'] } })), B)!;
    expect(p.body).toBe('진도·별점 다 적었어요. 이번 주도 함께 읽어요');
    expect(p.url).toBe('/');
  });

  it('멤버마다 자기 할 일로 계산한다', () => {
    const pushes = planPushes(base());
    expect(forMember(pushes, A)!.body).toContain('다 적었어요');
    expect(forMember(pushes, B)!.body).toContain('진도를 아직 안 적었어요');
  });
});

describe('planPushes · 보낸 기록', () => {
  it('같은 키를 이미 보낸 멤버는 뺀다', () => {
    const pushes = planPushes(base({ sent: [{ memberId: A, key: 'weekly:m2:2026-11-29' }] }));
    expect(pushes.map((p) => p.memberId)).toEqual([B]);
  });

  it('다른 날의 기록은 막지 않는다', () => {
    expect(planPushes(base({ sent: [{ memberId: A, key: 'weekly:m2:2026-11-22' }] }))).toHaveLength(2);
  });
});

describe('planPushes · 관리자 테스트 케이스', () => {
  const test = (c: 'weekly-none' | 'weekly-progress' | 'weekly-rate' | 'weekly-rate-many' | 'weekly-both' | 'weekly-d1', over: Partial<PlanInput> = {}) =>
    planPushes(base({ kind: { type: 'test', case: c, memberId: A }, today: '2026-11-26', ...over }));

  it('관리자 본인에게만, 기록 키 없이, 제목에 [테스트]', () => {
    const pushes = test('weekly-both');
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({ memberId: A, key: null });
    expect(pushes[0]!.title).toBe('[테스트] 📚 모임까지 D-17 · 12월 13일(일)');
  });

  it('실제 데이터에 케이스 모양을 강제한다(이미 다 적은 멤버여도)', () => {
    expect(test('weekly-none')[0]).toMatchObject({ body: '진도·별점 다 적었어요. 이번 주도 함께 읽어요', url: '/' });
    expect(test('weekly-progress')[0]).toMatchObject({ body: '『읽는 책』 1주차 진도를 아직 안 적었어요', url: '/books/now' });
    expect(test('weekly-rate')[0]).toMatchObject({ body: '『끝낸 책』 별점을 아직 안 남겼어요', url: '/rate?book=done' });
    expect(test('weekly-rate-many')[0]).toMatchObject({ body: '『끝낸 책』 외 1권 별점을 아직 안 남겼어요', url: '/?todo=1' });
    expect(test('weekly-both')[0]).toMatchObject({ body: '『읽는 책』 1주차 진도와 『끝낸 책』 별점을 아직 안 남겼어요', url: '/?todo=1' });
  });

  it('D-1 케이스는 내일 모임 제목이다', () => {
    expect(test('weekly-d1')[0]!.title).toBe('[테스트] 📚 내일 모임이에요 (D-1) · 11월 27일(금)');
  });

  it('주차 마감일이 아니어도, 이미 보낸 기록이 있어도 만든다', () => {
    expect(test('weekly-none', { sent: [{ memberId: A, key: 'weekly:m2:2026-11-26' }] })).toHaveLength(1);
  });

  it('케이스를 만들 데이터가 모자라면 빈 목록', () => {
    const noReading = base().books.map((b) => (b.id === 'now' ? { ...b, status: 'wishlist' as const } : b));
    expect(test('weekly-progress', { books: noReading })).toEqual([]);
    expect(test('weekly-rate-many', { books: base().books.filter((b) => b.id !== 'old') })).toEqual([]);
    expect(test('weekly-none', { meetings: base().meetings.filter((m) => m.id !== 'm2') })).toEqual([]);
  });
});
