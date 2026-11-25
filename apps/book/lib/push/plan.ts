/**
 * 푸시 대상 계산: "누구에게 무엇을 보낼지"를 한 곳에서 정한다(docs/features/push.md, ADR 0003·0004).
 * DB·네트워크·현재 시각에 의존하지 않는 순수 함수만 둔다. "오늘"은 호출하는 쪽이 서울 날짜로 넘긴다.
 * 크론·관리자 테스트는 데이터를 모아 이 함수를 부르고, 결과를 보내고 기록만 한다.
 * 나중에 네이티브 앱이 필요해져도 이 계산은 그대로 쓰고 발송 모듈(send.ts)만 바꾼다.
 *
 * 지금 계산하는 것: 주차 알림, 모임 당일 알림. (새 모임·날짜 변경은 이후 티켓에서 더한다.)
 */

import { addDays, daysBetween } from '@me/core/date';
import { fmtMonthDayWeekday } from '../format';
import { pendingNotices, type Notice } from '../notices';
import { currentWeek, previousMeetingDate, weekSchedule } from '../reading-progress';
import type { StatsBook, StatsMeeting, StatsMember, StatsRating } from '../stats';

/** 보낼 푸시 하나. key가 null이면 보낸 기록에 남기지 않는다(관리자 테스트). */
export type PlannedPush = { memberId: string; key: string | null; title: string; body: string; url: string };

/** 관리자 테스트 케이스. 실제 DB 데이터에 이 모양의 할 일을 강제로 채운다. */
export const TEST_CASES = ['weekly-none', 'weekly-progress', 'weekly-rate', 'weekly-both', 'weekly-rate-many', 'weekly-d1', 'meetingday-unfinished', 'meetingday-done'] as const;
export type TestCase = (typeof TEST_CASES)[number];

export type PlanKind =
  /** 매일 18시 크론: 오늘 보낼 알림 */
  | { type: 'daily' }
  /** 관리자 테스트: 그 멤버에게만, 기록 없이 */
  | { type: 'test'; case: TestCase; memberId: string };

export type PlanInput = {
  kind: PlanKind;
  /** 서울 날짜 'YYYY-MM-DD' */
  today: string;
  members: StatsMember[];
  books: StatsBook[];
  meetings: StatsMeeting[];
  ratings: StatsRating[];
  /** pages = 그 주차까지의 누적 쪽수 */
  progress: { bookId: string; memberId: string; week: number; pages: number }[];
  /** 멤버 id → 그 멤버가 숨긴(읽음) 알림 키 */
  dismissed: Record<string, string[]>;
  /** 이미 보낸 기록 */
  sent: { memberId: string; key: string }[];
};

/** 오늘 이후(오늘 제외) 가장 가까운 모임. */
const nextMeeting = (meetings: StatsMeeting[], today: string) => meetings.filter((m) => m.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];

/**
 * 오늘이 주차 알림을 보낼 날이면 그 모임과 남은 날. 보내는 날 = 다음 모임의 주차 마감일(마지막 주차는 모임 전날).
 * 다음 모임이 없거나 앞 모임이 없으면(첫 책) null. 주차 일정을 모임 날짜로 매번 다시 계산하므로 날짜가 바뀌면 바뀐 일정을 따른다.
 */
function weeklyDay(meetings: StatsMeeting[], today: string): { meeting: StatsMeeting; dday: number } | null {
  const meeting = nextMeeting(meetings, today);
  if (!meeting) return null;
  const prev = previousMeetingDate(meetings.map((m) => m.date), meeting.date);
  if (!prev) return null;
  if (!weekSchedule(prev, meeting.date).some((w) => w.dueDate === today)) return null;
  return { meeting, dday: daysBetween(today, meeting.date) };
}

/** `📚 모임까지 D-n · 12월 13일(일)`, D-1은 `📚 내일 모임이에요 (D-1) · …`. */
const weeklyTitle = (dday: number, meetingDate: string) =>
  `${dday === 1 ? '📚 내일 모임이에요 (D-1)' : `📚 모임까지 D-${dday}`} · ${fmtMonthDayWeekday(meetingDate)}`;

/** 본문 다섯 모양: 없음(응원) / 진도 / 별점 / 별점 2권 이상("외 n권") / 둘 다 한 문장. */
function weeklyBody(notices: Notice[]): string {
  const progress = notices.filter((n) => n.kind === 'progress');
  const rate = notices.filter((n) => n.kind === 'rate');
  if (progress.length === 0 && rate.length === 0) return '진도·별점 다 적었어요. 이번 주도 함께 읽어요';

  const first = progress[0];
  const progressPhrase = first && first.kind === 'progress' ? `『${first.title}』 ${first.week}주차 진도${progress.length > 1 ? ` 외 ${progress.length - 1}권` : ''}` : '';
  const ratePhrase = rate[0] ? `『${rate[0].title}』${rate.length > 1 ? ` 외 ${rate.length - 1}권` : ''} 별점` : '';

  if (progressPhrase && ratePhrase) return `${progressPhrase}와 ${ratePhrase}을 아직 안 남겼어요`;
  if (progressPhrase) return `${progressPhrase}를 아직 안 적었어요`;
  return `${ratePhrase}을 아직 안 남겼어요`;
}

/** 누르면 갈 곳: 0개 → 홈, 진도 1개 → 책 상세, 별점 1개 → 그 책 평점 화면, 2개 이상 → 홈에서 할 일 모달 강제 표시. */
function weeklyUrl(notices: Notice[]): string {
  if (notices.length === 0) return '/';
  if (notices.length === 1) return notices[0]!.href;
  return '/?todo=1';
}

function planWeekly(input: PlanInput): PlannedPush[] {
  const due = weeklyDay(input.meetings, input.today);
  if (!due) return [];
  const key = `weekly:${due.meeting.id}:${input.today}`;
  const already = new Set(input.sent.filter((s) => s.key === key).map((s) => s.memberId));
  const title = weeklyTitle(due.dday, due.meeting.date);

  return input.members
    .filter((m) => m.status === 'active' && !already.has(m.id))
    .map((m) => {
      const notices = pendingNotices({
        books: input.books,
        meetings: input.meetings,
        ratings: input.ratings,
        progress: input.progress,
        memberId: m.id,
        today: input.today,
        dismissed: input.dismissed[m.id] ?? [],
      });
      return { memberId: m.id, key, title, body: weeklyBody(notices), url: weeklyUrl(notices) };
    });
}

/**
 * 관리자 테스트: 실제 DB 데이터(다음 모임, 읽는 책, 최근 읽은 책)로 만들고, 할 일은 고른 케이스 모양으로 채운다.
 * 보내는 날·보낸 기록·숨김은 보지 않는다. 케이스를 만들 데이터가 모자라면 빈 목록.
 */
function planTest(input: PlanInput, kind: Extract<PlanKind, { type: 'test' }>): PlannedPush[] {
  const meeting = nextMeeting(input.meetings, input.today);
  if (!meeting) return [];

  const latestMeetingDate = (bookId: string) => input.meetings.filter((m) => m.bookId === bookId).map((m) => m.date).reduce((a, b) => (a > b ? a : b), '');
  const reading = input.books.find((b) => b.status === 'reading');
  const done = input.books.filter((b) => b.status === 'done').sort((a, b) => latestMeetingDate(b.id).localeCompare(latestMeetingDate(a.id)));

  const progressNotice = (): Notice | null => {
    if (!reading) return null;
    const m = input.meetings.filter((x) => x.bookId === reading.id).sort((a, b) => b.date.localeCompare(a.date))[0] ?? meeting;
    const prev = previousMeetingDate(input.meetings.map((x) => x.date), m.date);
    const week = (prev && currentWeek(weekSchedule(prev, m.date), input.today)) || 1;
    return { kind: 'progress', key: `progress:${reading.id}:${week}`, bookId: reading.id, title: reading.title, week, dismissable: true, href: `/books/${reading.id}` };
  };
  const rateNotices = (n: number): Notice[] =>
    done.slice(0, n).map((b) => ({ kind: 'rate', key: `rate:${b.id}`, bookId: b.id, title: b.title, dismissable: false, href: `/rate?book=${b.id}` }));

  let notices: Notice[] | null;
  switch (kind.case) {
    case 'weekly-none':
    case 'weekly-d1':
      notices = [];
      break;
    case 'weekly-progress': {
      const p = progressNotice();
      notices = p ? [p] : null;
      break;
    }
    case 'weekly-rate':
      notices = done.length >= 1 ? rateNotices(1) : null;
      break;
    case 'weekly-rate-many':
      notices = done.length >= 2 ? rateNotices(2) : null;
      break;
    case 'weekly-both': {
      const p = progressNotice();
      notices = p && done.length >= 1 ? [p, ...rateNotices(1)] : null;
      break;
    }
    case 'meetingday-unfinished':
    case 'meetingday-done':
      return []; // planMeetingDayTest가 맡는다
  }
  if (!notices) return [];

  const d1 = kind.case === 'weekly-d1';
  const title = `[테스트] ${weeklyTitle(d1 ? 1 : daysBetween(input.today, meeting.date), d1 ? addDays(input.today, 1) : meeting.date)}`;
  return [{ memberId: kind.memberId, key: null, title, body: weeklyBody(notices), url: weeklyUrl(notices) }];
}

// ───────────── 모임 당일 ─────────────

/** 오늘 열리는 모임. 없으면 undefined. */
const todayMeeting = (meetings: StatsMeeting[], today: string) => meetings.find((m) => m.date === today);

/** `📚 오늘 모임이에요 · 12월 13일(일)`. 시각은 쓰지 않는다. */
const meetingDayTitle = (meetingDate: string) => `📚 오늘 모임이에요 · ${fmtMonthDayWeekday(meetingDate)}`;

/** 완독 전: 마지막 진도를 적어 달라고 하고 책 상세로. 완독: 인사만 하고 모임 상세로. */
function meetingDayMessage(book: { id: string; title: string }, finished: boolean): { body: string; url: string } {
  return finished
    ? { body: '오늘 만나요', url: '/meetings' }
    : { body: `『${book.title}』 오늘 만나요. 마지막으로 얼마나 읽었는지 적어 주세요`, url: `/books/${book.id}` };
}

/** 완독 = 그 책의 마지막 기록(가장 큰 주차)의 쪽수가 총 쪽수와 같음. 총 쪽수가 없으면 알 수 없으므로 완독 전으로 본다. */
function isFinished(book: StatsBook, memberId: string, progress: PlanInput['progress']): boolean {
  if (book.pages === null) return false;
  const last = progress.filter((p) => p.bookId === book.id && p.memberId === memberId).sort((a, b) => b.week - a.week)[0];
  return last !== undefined && last.pages === book.pages;
}

function planMeetingDay(input: PlanInput): PlannedPush[] {
  const meeting = todayMeeting(input.meetings, input.today);
  const book = meeting && input.books.find((b) => b.id === meeting.bookId);
  if (!meeting || !book) return [];
  const key = `meetingday:${meeting.id}:${input.today}`;
  const already = new Set(input.sent.filter((s) => s.key === key).map((s) => s.memberId));
  const title = meetingDayTitle(meeting.date);

  return input.members
    .filter((m) => m.status === 'active' && !already.has(m.id))
    .map((m) => ({ memberId: m.id, key, title, ...meetingDayMessage(book, isFinished(book, m.id, input.progress)) }));
}

/**
 * 관리자 테스트(모임 당일): 다음 모임(오늘 모임이 있으면 그 모임)의 책으로 만든다. 오늘이 모임 날인 것처럼 제목 날짜는 오늘을 쓴다.
 * 보내는 날·보낸 기록은 보지 않는다. 모임이나 책이 없으면 빈 목록.
 */
function planMeetingDayTest(input: PlanInput, kind: Extract<PlanKind, { type: 'test' }>): PlannedPush[] {
  const meeting = todayMeeting(input.meetings, input.today) ?? nextMeeting(input.meetings, input.today);
  const book = meeting && input.books.find((b) => b.id === meeting.bookId);
  if (!meeting || !book) return [];
  const msg = meetingDayMessage(book, kind.case === 'meetingday-done');
  return [{ memberId: kind.memberId, key: null, title: `[테스트] ${meetingDayTitle(input.today)}`, ...msg }];
}

/** 푸시 대상 계산의 입구. 결과는 보낼 순서대로. */
export function planPushes(input: PlanInput): PlannedPush[] {
  if (input.kind.type === 'test') return input.kind.case.startsWith('meetingday-') ? planMeetingDayTest(input, input.kind) : planTest(input, input.kind);
  return [...planWeekly(input), ...planMeetingDay(input)];
}
