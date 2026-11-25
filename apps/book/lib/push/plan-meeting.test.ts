import { describe, expect, it } from 'vitest';
import { planPushes, type PlanInput } from './plan';

// 다음 모임 m2: 12/13(일), 책 '읽는 책'. 오늘 11/29이면 D-14.
const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  kind: { type: 'meeting-new', meetingId: 'm2' },
  today: '2026-11-29',
  members: [
    { id: 'a', name: 'A', rotationOrder: 1, status: 'active' },
    { id: 'b', name: 'B', rotationOrder: 2, status: 'active' },
    { id: 'c', name: 'C', rotationOrder: 3, status: 'pending' },
  ],
  books: [{ id: 'now', title: '읽는 책', pages: 300, status: 'reading', selectedBy: null }],
  meetings: [{ id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' }],
  ratings: [],
  progress: [],
  dismissed: {},
  sent: [],
  ...over,
});

const changed = (oldDate: string, over: Partial<PlanInput> = {}) => base({ kind: { type: 'meeting-datechange', meetingId: 'm2', oldDate }, ...over });

describe('새 모임', () => {
  it('활동 멤버 모두에게 단독 문구로 간다', () => {
    const out = planPushes(base());
    expect(out.map((p) => p.memberId)).toEqual(['a', 'b']);
    expect(out[0]).toMatchObject({ key: 'meeting:m2', title: '📚 다음 모임이 정해졌어요 · 12월 13일(일) D-14', body: '『읽는 책』을 읽어요', url: '/meetings/m2/edit' });
  });
  it('앞 모임이 있으면 회차 완료 문구(D-n 없음)로, 책 이름은 15자에서 줄이고 새 책은 줄이지 않는다', () => {
    const long = '가나다라마바사아자차카타파하가나다라';
    const out = planPushes(
      base({
        books: [
          { id: 'old', title: long, pages: 200, status: 'done', selectedBy: null },
          { id: 'now', title: '아주 아주 아주 아주 긴 새 책 이름입니다', pages: 300, status: 'reading', selectedBy: null },
        ],
        meetings: [
          { id: 'm1', number: 2, date: '2026-11-15', bookId: 'old' },
          { id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' },
        ],
      }),
    );
    expect(out[0]).toMatchObject({
      key: 'meeting:m2',
      title: '🎉 2회차 독서 모임 완료 · 『가나다라마바사아자차카타파하가…』',
      body: '다음 모임은 12월 13일(일), 『아주 아주 아주 아주 긴 새 책 이름입니다』로 이어가요',
      url: '/meetings/m2/edit',
    });
  });
  it('15자 이하 책 이름은 그대로 둔다', () => {
    const out = planPushes(
      base({
        books: [
          { id: 'old', title: '짧은 책', pages: 200, status: 'done', selectedBy: null },
          { id: 'now', title: '읽는 책', pages: 300, status: 'reading', selectedBy: null },
        ],
        meetings: [
          { id: 'm1', number: 2, date: '2026-11-15', bookId: 'old' },
          { id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' },
        ],
      }),
    );
    expect(out[0]!.title).toBe('🎉 2회차 독서 모임 완료 · 『짧은 책』');
  });
  it('앞 모임의 책을 못 찾으면 기존 문구로 돌아간다', () => {
    const out = planPushes(base({ meetings: [{ id: 'm1', number: 2, date: '2026-11-15', bookId: 'gone' }, { id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' }] }));
    expect(out[0]!.title).toBe('📚 다음 모임이 정해졌어요 · 12월 13일(일) D-14');
  });
  it('이미 보낸 멤버는 뺀다', () => {
    expect(planPushes(base({ sent: [{ memberId: 'a', key: 'meeting:m2' }] })).map((p) => p.memberId)).toEqual(['b']);
  });
});

describe('날짜 변경', () => {
  it('바뀌면 옛 → 새 날짜 문구와 날짜 키로 간다', () => {
    const out = planPushes(changed('2026-12-06'));
    expect(out[0]).toMatchObject({ key: 'datechange:m2:2026-12-13', title: '📚 모임 날짜가 바뀌었어요 · 12월 13일(일) D-14', body: '『읽는 책』 12월 6일(일) → 12월 13일(일)' });
  });
  it('날짜가 같으면 없다', () => {
    expect(planPushes(changed('2026-12-13'))).toEqual([]);
  });
  it('옛·새 날짜가 모두 지난 날이면 없다', () => {
    expect(planPushes(changed('2026-11-01', { meetings: [{ id: 'm2', number: 3, date: '2026-11-08', bookId: 'now' }] }))).toEqual([]);
  });
  it('옛 날짜만 지났어도 보낸다', () => {
    expect(planPushes(changed('2026-11-01'))).toHaveLength(2);
  });
  it('같은 날짜로 이미 보낸 멤버는 제외하고, 다른 새 날짜는 다시 보낸다', () => {
    expect(planPushes(changed('2026-12-06', { sent: [{ memberId: 'a', key: 'datechange:m2:2026-12-13' }] })).map((p) => p.memberId)).toEqual(['b']);
    expect(planPushes(changed('2026-12-06', { sent: [{ memberId: 'a', key: 'datechange:m2:2026-12-20' }] })).map((p) => p.memberId)).toEqual(['a', 'b']);
  });
});

describe('관리자 테스트', () => {
  it('새 모임·날짜 변경 케이스는 그 멤버에게만, 기록 없이, [테스트]가 붙는다', () => {
    for (const c of ['meeting-new', 'meeting-datechange'] as const) {
      const out = planPushes(base({ kind: { type: 'test', case: c, memberId: 'a' } }));
      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({ memberId: 'a', key: null });
      expect(out[0]!.title.startsWith('[테스트] 📚')).toBe(true);
    }
  });
  it('새 모임 케이스도 앞 모임이 있으면 새 문구로 보낸다', () => {
    const out = planPushes(
      base({
        books: [
          { id: 'old', title: '끝난 책', pages: 200, status: 'done', selectedBy: null },
          { id: 'now', title: '읽는 책', pages: 300, status: 'reading', selectedBy: null },
        ],
        meetings: [
          { id: 'm1', number: 2, date: '2026-11-15', bookId: 'old' },
          { id: 'm2', number: 3, date: '2026-12-13', bookId: 'now' },
        ],
        kind: { type: 'test', case: 'meeting-new', memberId: 'a' },
      }),
    );
    expect(out[0]).toMatchObject({ title: '[테스트] 🎉 2회차 독서 모임 완료 · 『끝난 책』', body: '다음 모임은 12월 13일(일), 『읽는 책』로 이어가요' });
  });
  it('다음 모임이 없으면 빈 목록', () => {
    expect(planPushes(base({ today: '2027-01-01', kind: { type: 'test', case: 'meeting-new', memberId: 'a' } }))).toEqual([]);
  });
});
