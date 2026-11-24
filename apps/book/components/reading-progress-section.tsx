import { NoMeetingDialog } from '@/components/no-meeting-dialog';
import { ProgressRow } from '@/components/progress-row';
import { Card, Section } from '@me/ui/section';
import { fmtDate } from '@/lib/format';
import { currentWeek, isWeekOpen, previousMeetingDate, weekSchedule } from '@/lib/reading-progress';

type Props = {
  book: { id: string; status: string; pages: number | null };
  /** 이 책의 모임(없으면 undefined) */
  meeting: { date: string } | undefined;
  /** 모든 모임의 날짜(앞 모임을 찾는 데 쓴다) */
  meetingDates: string[];
  /** 내 기록 (이 책) */
  mine: { week: number; pages: number }[];
  today: string;
};

/**
 * 책 상세의 "내 진도" 구역(로그인한 멤버에게만 부른다).
 * 읽는 중: 주차별 입력 줄. 읽은 책: 내 기록이 있으면 읽기 전용으로 보여 준다. 그 밖(위시리스트, 앞 모임이 없는 첫 책)은 아무것도 그리지 않는다.
 */
export function ReadingProgressSection({ book, meeting, meetingDates, mine, today }: Props) {
  const reading = book.status === 'reading';
  if (!reading && !(book.status === 'done' && mine.length > 0)) return null;

  if (!meeting) {
    return reading ? (
      <Section title="내 진도">
        <NoMeetingDialog />
      </Section>
    ) : null;
  }
  const prev = previousMeetingDate(meetingDates, meeting.date);
  if (!prev) return null; // 첫 책은 진도 기록 대상이 아니다
  const schedule = weekSchedule(prev, meeting.date);
  if (schedule.length === 0) return null;

  const current = currentWeek(schedule, today);
  const savedOf = (week: number) => mine.find((r) => r.week === week)?.pages ?? null;
  return (
    <Section title="내 진도">
      <Card className="py-2">
        <ul className="divide-y divide-line">
          {schedule.map((w) => (
            <ProgressRow
              key={w.week}
              bookId={book.id}
              week={w.week}
              dueLabel={fmtDate(w.dueDate)}
              open={isWeekOpen(w.dueDate, today)}
              current={w.week === current}
              saved={savedOf(w.week)}
              totalPages={book.pages}
              readOnly={!reading}
            />
          ))}
        </ul>
      </Card>
    </Section>
  );
}
