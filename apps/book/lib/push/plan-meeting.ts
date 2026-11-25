/**
 * 새 모임·날짜 변경 푸시 계산(#59). plan.ts의 planPushes가 kind에 따라 여기를 부른다(docs/features/push.md).
 * 순수 함수만 둔다. 크론이 아니라 모임 저장 서버 액션이 저장 직후 바로 보내므로 "오늘 보낼 날" 판정은 없다.
 */

import { addDays, daysBetween } from '@me/core/date';
import { fmtMonthDayWeekday } from '../format';
import type { StatsMeeting } from '../stats';
import type { PlannedPush, PlanInput } from './plan';

export type MeetingPlanKind =
  | { type: 'meeting-new'; meetingId: string }
  | { type: 'meeting-datechange'; meetingId: string; oldDate: string }
  /** 관리자 테스트: 다음 모임으로 만들고 그 멤버에게만, 기록 없이 */
  | { type: 'meeting-test'; case: 'meeting-new' | 'meeting-datechange'; memberId: string };

/** `D-14`, 오늘이면 `D-day`, 지난 날이면 `D+3`. */
const ddayLabel = (today: string, date: string) => {
  const n = daysBetween(today, date);
  return n === 0 ? 'D-day' : n > 0 ? `D-${n}` : `D+${-n}`;
};

const meetingUrl = (meetingId: string) => `/meetings#m-${meetingId}`;

/** 제목에 넣는 책 이름은 15자를 넘으면 `…`로 줄인다(글자 단위). */
const shortTitle = (t: string) => {
  const chars = [...t];
  return chars.length > 15 ? `${chars.slice(0, 15).join('')}…` : t;
};

/**
 * 새 모임 문구. 바로 앞 모임(회차 번호가 가장 큰 앞 회차)과 그 책이 있으면 "n회차 완료 · 다음 모임은 …로 이어가요"(D-n 없음),
 * 없으면(첫 모임·앞 모임의 책을 못 찾음) "다음 모임이 정해졌어요". 읽는 책이 있으면 선정이 거절되므로 앞 모임은 항상 끝난 상태라 날짜는 따지지 않는다.
 */
function newMeetingContent(input: PlanInput, meeting: StatsMeeting, bookTitle: string) {
  const prev = input.meetings.filter((m) => m.number < meeting.number).sort((a, b) => b.number - a.number)[0];
  const prevBook = prev && input.books.find((b) => b.id === prev.bookId);
  if (prev && prevBook) {
    return {
      title: `🎉 ${prev.number}회차 독서 모임 완료 · 『${shortTitle(prevBook.title)}』`,
      body: `다음 모임은 ${fmtMonthDayWeekday(meeting.date)}, 『${bookTitle}』로 이어가요`,
    };
  }
  return {
    title: `📚 다음 모임이 정해졌어요 · ${fmtMonthDayWeekday(meeting.date)} ${ddayLabel(input.today, meeting.date)}`,
    body: `『${bookTitle}』을 읽어요`,
  };
}

const dateChangeContent = (today: string, oldDate: string, newDate: string, bookTitle: string) => ({
  title: `📚 모임 날짜가 바뀌었어요 · ${fmtMonthDayWeekday(newDate)} ${ddayLabel(today, newDate)}`,
  body: `『${bookTitle}』 ${fmtMonthDayWeekday(oldDate)} → ${fmtMonthDayWeekday(newDate)}`,
});

/** 알림을 켠 것과 무관하게 "활동 멤버 모두"를 대상으로 하고, 기기가 없는 멤버는 발송 단계에서 걸러진다. 이미 보낸 키는 뺀다. */
const recipients = (input: PlanInput, key: string) => {
  const already = new Set(input.sent.filter((s) => s.key === key).map((s) => s.memberId));
  return input.members.filter((m) => m.status === 'active' && !already.has(m.id));
};

export function planMeeting(input: PlanInput, kind: MeetingPlanKind): PlannedPush[] {
  if (kind.type === 'meeting-test') return planMeetingTest(input, kind);

  const meeting = input.meetings.find((m) => m.id === kind.meetingId);
  if (!meeting) return [];
  const bookTitle = input.books.find((b) => b.id === meeting.bookId)?.title ?? '이번 책';
  const url = meetingUrl(meeting.id);

  if (kind.type === 'meeting-new') {
    const key = `meeting:${meeting.id}`;
    const { title, body } = newMeetingContent(input, meeting, bookTitle);
    return recipients(input, key).map((m) => ({ memberId: m.id, key, title, body, url }));
  }

  // 날짜가 실제로 바뀌었을 때만. 옛·새 날짜가 모두 오늘 이전이면 알릴 일이 아니다.
  if (kind.oldDate === meeting.date) return [];
  if (kind.oldDate < input.today && meeting.date < input.today) return [];
  const key = `datechange:${meeting.id}:${meeting.date}`;
  const { title, body } = dateChangeContent(input.today, kind.oldDate, meeting.date, bookTitle);
  return recipients(input, key).map((m) => ({ memberId: m.id, key, title, body, url }));
}

/** 관리자 테스트: 다음 모임(없으면 빈 목록)으로 만든다. 날짜 변경은 옛 날짜를 7일 앞으로 가정한다. */
function planMeetingTest(input: PlanInput, kind: Extract<MeetingPlanKind, { type: 'meeting-test' }>): PlannedPush[] {
  const meeting = input.meetings.filter((m) => m.date > input.today).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!meeting) return [];
  const bookTitle = input.books.find((b) => b.id === meeting.bookId)?.title ?? '이번 책';
  const content =
    kind.case === 'meeting-new'
      ? newMeetingContent(input, meeting, bookTitle)
      : dateChangeContent(input.today, addDays(meeting.date, -7), meeting.date, bookTitle);
  return [{ memberId: kind.memberId, key: null, title: `[테스트] ${content.title}`, body: content.body, url: meetingUrl(meeting.id) }];
}
