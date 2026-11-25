import { Card, Section } from '@me/ui/section';
import { ProgressChart } from '@/components/charts/progress-chart';
import { previousMeetingDate, progressPoints, weekSchedule } from '@/lib/reading-progress';

type Props = {
  /** 읽는 중인 책(없으면 구역을 그리지 않는다) */
  book: { id: string; pages: number | null } | undefined;
  /** 이 책의 모임 */
  meeting: { date: string } | undefined;
  meetingDates: string[];
  /** 활동 멤버. 이름은 getClubData()가 게스트에게 이미 가린 값이다 */
  members: { id: string; name: string; color: string }[];
  /** 모든 멤버의 진도 기록(getClubData의 reading_progress) */
  rows: { book_id: string; member_id: string; week: number; pages: number }[];
};

/**
 * 대시보드의 "모두의 진도" 구역: 읽는 책의 멤버별 선 그래프.
 * 읽는 책·모임·앞 모임(첫 책)이 없으면 통째로 숨긴다. 데이터는 getClubData() 결과만 받으므로 게스트에게는 가려진 이름이 간다.
 */
export function MemberProgressSection({ book, meeting, meetingDates, members, rows }: Props) {
  if (!book || !meeting) return null;
  const prev = previousMeetingDate(meetingDates, meeting.date);
  if (!prev) return null;
  const schedule = weekSchedule(prev, meeting.date);
  if (schedule.length === 0) return null;

  const series = members.map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color,
    points: progressPoints(schedule, rows.filter((r) => r.book_id === book.id && r.member_id === m.id), book.pages),
  }));
  if (series.length === 0) return null;

  return (
    <Section title="모두의 진도">
      <Card>
        <ProgressChart series={series} weeks={schedule.map((w) => w.week)} totalPages={book.pages} caption="멤버별 읽기 진도" />
      </Card>
    </Section>
  );
}
