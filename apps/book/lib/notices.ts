/**
 * 할 일 알림(🔔·할 일 모달) 계산. 알림은 저장하지 않고 볼 때마다 이 함수로 계산한다(docs/features/notices.md).
 * DB·네트워크·현재 시각에 의존하지 않는 순수 함수만 둔다. "오늘"은 호출하는 쪽이 서울 날짜로 넘긴다.
 */

import { currentWeek, previousMeetingDate, weekSchedule } from './reading-progress';
import { unratedBooks, type StatsBook, type StatsMeeting, type StatsRating } from './stats';

export type Notice =
  | { kind: 'rate'; key: string; bookId: string; title: string; dismissable: false; href: string }
  | { kind: 'progress'; key: string; bookId: string; title: string; week: number; dismissable: true; href: string };

export type NoticeInput = {
  books: StatsBook[];
  meetings: StatsMeeting[];
  ratings: StatsRating[];
  progress: { bookId: string; memberId: string; week: number }[];
  memberId: string;
  /** 서울 날짜 'YYYY-MM-DD' */
  today: string;
  /** 숨긴(읽음) 알림 키. 진도 알림에만 적용한다 */
  dismissed: string[];
};

/**
 * 이 멤버가 지금 해야 할 일. 진도 알림이 앞, 평점 알림이 뒤(평점은 모임 날짜가 늦은 책부터).
 * - 평점(`rate:<책id>`): 미평점 모달과 같은 조건(unratedBooks). 숨길 수 없다(평점을 매겨야 사라진다).
 * - 진도(`progress:<책id>:<주차>`): 읽는 책마다, 입력 칸이 열린 가장 최근 주차에 내 기록이 없으면 하나. 더 앞의 빈 주차는 세지 않는다.
 *   책의 모임(가장 늦은 것)·앞 모임·열린 주차 중 하나라도 없으면 없다. 숨김 키에 있으면 뺀다.
 */
export function pendingNotices(o: NoticeInput): Notice[] {
  const dismissed = new Set(o.dismissed);
  const meetingDates = o.meetings.map((m) => m.date);

  const progress: Notice[] = o.books
    .filter((b) => b.status === 'reading')
    .flatMap((b) => {
      const meeting = o.meetings.filter((m) => m.bookId === b.id).sort((x, y) => y.date.localeCompare(x.date))[0];
      if (!meeting) return [];
      const prev = previousMeetingDate(meetingDates, meeting.date);
      if (!prev) return [];
      const week = currentWeek(weekSchedule(prev, meeting.date), o.today);
      if (week === null) return [];
      if (o.progress.some((p) => p.bookId === b.id && p.memberId === o.memberId && p.week === week)) return [];
      const key = `progress:${b.id}:${week}`;
      if (dismissed.has(key)) return [];
      return [{ kind: 'progress', key, bookId: b.id, title: b.title, week, dismissable: true, href: `/books/${b.id}` } as const];
    });

  const rate: Notice[] = unratedBooks(o.books, o.meetings, o.ratings, o.memberId).map((b) => ({
    kind: 'rate',
    key: `rate:${b.id}`,
    bookId: b.id,
    title: b.title,
    dismissable: false,
    href: `/rate?book=${b.id}`,
  }));

  return [...progress, ...rate];
}
