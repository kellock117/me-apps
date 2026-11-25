'use server';

import { z } from 'zod';
import { nextQuoteId, quoteIdForDay } from '@/lib/daily-quote';
import { bookAverage, todayInSeoul } from '@/lib/stats';
import { getView } from '@/lib/view';

/** 문장 탭에 보여 줄 문장 하나와 그 책 정보. 문장 전체가 아니라 이 하나만 클라이언트로 간다. */
export type DailyQuote = {
  id: string;
  text: string;
  memberName: string;
  book: { id: string; title: string; authors: string[]; genre: string | null; coverPath: string | null; selectorName: string | null; avg: number | null; n: number };
  /** 전체 문장 수. 1 이하면 "다른 문장 보기"를 숨긴다. */
  total: number;
  /** 다 봐서 처음부터 다시 도는 중이면 true. 클라이언트는 본 목록을 비우고 이 문장부터 다시 센다. */
  restarted: boolean;
};

const seenSchema = z.array(z.string().max(64)).max(5000);

/**
 * 오늘의 문장 하나를 가져온다. 읽기 전용이라 게스트도 쓴다(로그인 확인 없음). 게스트에게는 getClubData가 이미 멤버 이름을 가려서 준다.
 * @param seen 이 화면에서 이미 보여 준 문장 id. 비어 있으면 서울 날짜 기준 오늘의 문장, 아니면 안 본 것 중 무작위.
 * @returns 문장이 하나도 없으면 null
 */
export async function getDailyQuote(seen: string[]): Promise<DailyQuote | null> {
  const parsed = seenSchema.safeParse(seen);
  if (!parsed.success) return null;
  const { data, s, memberById, bookById } = await getView();
  const ids = data.quotes.map((q) => q.id);
  if (ids.length === 0) return null;

  let id: string | null;
  let restarted = false;
  if (parsed.data.length === 0) id = quoteIdForDay(ids, todayInSeoul(new Date()));
  else {
    const next = nextQuoteId(ids, parsed.data, Math.random);
    id = next?.id ?? null;
    restarted = next?.restarted ?? false;
  }
  const q = data.quotes.find((x) => x.id === id);
  const book = q ? bookById.get(q.book_id) : undefined;
  if (!q || !book) return null;

  const { avg, n } = bookAverage(s.ratings, book.id);
  return {
    id: q.id,
    text: q.text,
    memberName: memberById.get(q.member_id)?.name ?? '',
    book: {
      id: book.id,
      title: book.title,
      authors: book.authors,
      genre: book.genre,
      coverPath: book.cover_path,
      selectorName: book.selected_by ? (memberById.get(book.selected_by)?.name ?? null) : null,
      avg,
      n,
    },
    total: ids.length,
    restarted,
  };
}
