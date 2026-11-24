'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@me/core/server/supabase';
import { getCurrentMember } from '@/lib/auth/member';
import { checkProgress, isWeekOpen, previousMeetingDate, previousPages, weekSchedule } from '@/lib/reading-progress';
import { todayInSeoul } from '@/lib/stats';
import { progressInputSchema } from '@/lib/validation/progress';

export type ProgressState = {
  /** 저장에 성공하면 저장한 쪽수 */
  saved?: number;
  /** 저장은 됐지만 알려 줄 것(앞 주차보다 줄어듦) */
  warning?: string;
  error?: string;
};

const FAIL = '저장하지 못했어요. 잠시 뒤에 다시 해 주세요';
const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

/**
 * 한 주차의 누적 쪽수를 저장(같은 주차에 다시 내면 갱신)한다. 로그인한 멤버 본인의 기록만 쓴다.
 * 읽는 중인 책이고, 그 주차의 기준일이 됐을 때만 받는다. 화면이 막아도 여기서 같은 규칙을 다시 본다.
 */
export async function saveProgress(_prev: ProgressState, formData: FormData): Promise<ProgressState> {
  const me = await getCurrentMember();
  if (!me) redirect('/who');

  const parsed = progressInputSchema.safeParse({ bookId: str(formData.get('bookId')), week: str(formData.get('week')), pages: str(formData.get('pages')) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? FAIL };
  const { bookId, week, pages } = parsed.data;

  const db = createAdminClient();
  // 캐시가 아니라 DB에서 직접 읽는다
  const [bookRes, meetingsRes, mineRes] = await Promise.all([
    db.from('book_books').select('id,status,pages').eq('id', bookId).maybeSingle(),
    db.from('book_meetings').select('book_id,date'),
    db.from('book_reading_progress').select('week,pages').eq('book_id', bookId).eq('member_id', me.id),
  ]);
  if (bookRes.error || meetingsRes.error || mineRes.error) return { error: FAIL };
  const book = bookRes.data;
  if (!book) return { error: '없는 책이에요' };
  if (book.status !== 'reading') return { error: '읽는 중인 책에만 적을 수 있어요' };

  const thisMeeting = meetingsRes.data
    .filter((m) => m.book_id === bookId)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!thisMeeting) return { error: '모임을 먼저 정해 주세요' };
  const prev = previousMeetingDate(
    meetingsRes.data.map((m) => m.date),
    thisMeeting.date,
  );
  if (!prev) return { error: '이 책은 진도를 적지 않아요' };

  const target = weekSchedule(prev, thisMeeting.date).find((w) => w.week === week);
  if (!target) return { error: '없는 주차예요' };
  if (!isWeekOpen(target.dueDate, todayInSeoul(new Date()))) return { error: '아직 열리지 않은 주차예요' };

  const check = checkProgress(pages, { totalPages: book.pages, previous: previousPages(mineRes.data, week) });
  if (!check.ok) return { error: check.error === 'over-total' ? `이 책은 ${book.pages}쪽까지예요` : '읽은 쪽수를 0 이상의 숫자로 적어 주세요' };

  const { error } = await db.from('book_reading_progress').upsert({ book_id: bookId, member_id: me.id, week, pages }, { onConflict: 'book_id,member_id,week' });
  if (error) return { error: FAIL };

  revalidatePath('/', 'layout'); // 브라우저 라우터 캐시를 비워 바로 새 데이터를 보여 준다
  return { saved: pages, warning: check.decreased ? '앞 주차보다 줄었어요' : undefined };
}
