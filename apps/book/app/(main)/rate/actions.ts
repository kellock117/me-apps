'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentMember } from '@/lib/auth/member';
import { createAdminClient } from '@me/core/server/supabase';
import { ratingInputSchema } from '@/lib/validation/rating';

export type RateState = {
  errors?: Partial<Record<'bookId' | 'score' | 'review' | 'quotes' | 'form', string[]>>;
  /** 실패했을 때 입력값을 그대로 돌려 준다 */
  values?: { score: string; review: string; quotes: string[] };
};

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');
const strs = (vs: FormDataEntryValue[]) => vs.filter((v): v is string => typeof v === 'string');

export async function saveRating(_prev: RateState, formData: FormData): Promise<RateState> {
  const values = { score: str(formData.get('score')), review: str(formData.get('review')), quotes: strs(formData.getAll('quote')) };

  const me = await getCurrentMember();
  if (!me) redirect('/who');

  const parsed = ratingInputSchema.safeParse({ bookId: str(formData.get('bookId')), ...values });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  const input = parsed.data;

  const db = createAdminClient();

  // 캐시가 아니라 DB에서 직접: 완료된 책에만 평점을 남길 수 있다
  const { data: book, error: bookErr } = await db.from('book_books').select('id,status').eq('id', input.bookId).maybeSingle();
  if (bookErr) return { errors: { form: ['저장하지 못했어요. 잠시 뒤에 다시 해 주세요'] }, values };
  if (!book) return { errors: { bookId: ['없는 책이에요'] }, values };
  if (book.status !== 'done') return { errors: { bookId: ['아직 모임이 끝나지 않은 책이에요'] }, values };

  // (책, 멤버)당 1개. 다시 내면 덮어쓴다
  const { error } = await db
    .from('book_ratings')
    .upsert(
      { book_id: input.bookId, member_id: me.id, score: input.score, review: input.review },
      { onConflict: 'book_id,member_id' },
    );
  if (error) return { errors: { form: ['저장하지 못했어요. 잠시 뒤에 다시 해 주세요'] }, values };

  // 내 문장은 통째로 덮어쓴다: 새 목록을 순서대로 넣고(같은 순서는 갱신), 남는 뒤쪽 순서는 지운다. 모두 비우면 전부 지워진다.
  // 지우기 전에 새 문장부터 넣어서, 중간에 실패해도 문장이 한꺼번에 사라지지 않는다.
  if (input.quotes.length > 0) {
    const rows = input.quotes.map((text, ord) => ({ book_id: input.bookId, member_id: me.id, ord, text }));
    const { error: qErr } = await db.from('book_quotes').upsert(rows, { onConflict: 'book_id,member_id,ord' });
    if (qErr) return { errors: { form: ['저장하지 못했어요. 잠시 뒤에 다시 해 주세요'] }, values };
  }
  const { error: delErr } = await db.from('book_quotes').delete().eq('book_id', input.bookId).eq('member_id', me.id).gte('ord', input.quotes.length);
  if (delErr) return { errors: { form: ['저장하지 못했어요. 잠시 뒤에 다시 해 주세요'] }, values };

  revalidatePath('/', 'layout'); // 브라우저 라우터 캐시를 비워 바로 새 데이터를 보여 준다
  redirect(`/books/${input.bookId}?toast=rated`);
}
