import 'server-only';
import { getClubData } from '@/lib/data';
import { pendingNotices } from '@/lib/notices';
import { todayInSeoul } from '@/lib/stats';
import { toStats } from '@/lib/to-stats';

/** 보기 페이지 공통 재료: 원본 행, 통계용 모양, 한국 시간 오늘, 멤버·책 찾기표. */
export async function getView() {
  const data = await getClubData();
  const s = toStats(data);
  const today = todayInSeoul(new Date());
  const memberById = new Map(data.members.map((m) => [m.id, m]));
  const bookById = new Map(data.books.map((b) => [b.id, b]));
  const colors = Object.fromEntries(data.members.map((m) => [m.id, m.color]));
  /** 책이 열린 모임(가장 늦은 것). */
  const meetingOfBook = (bookId: string) => data.meetings.filter((m) => m.book_id === bookId).sort((a, b) => b.date.localeCompare(a.date))[0];
  return { data, s, today, memberById, bookById, colors, meetingOfBook };
}

/**
 * 로그인한 멤버의 할 일 알림(🔔·할 일 모달). 저장하지 않고 요청마다 계산한다. 게스트에게는 부르지 않는다.
 * 숨김(읽음) 키는 아직 없어서 빈 목록이다.
 */
export async function getMyNotices(memberId: string) {
  const { data, s, today } = await getView();
  const progress = data.reading_progress.map((r) => ({ bookId: r.book_id, memberId: r.member_id, week: r.week }));
  return pendingNotices({ books: s.books, meetings: s.meetings, ratings: s.ratings, progress, memberId, today, dismissed: [] });
}
