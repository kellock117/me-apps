import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Cover } from '@/components/cover';
import { getCurrentMember } from '@/lib/auth/member';
import { getClubData } from '@/lib/data';
import { RatingForm } from './rating-form';

export const metadata: Metadata = { title: '평점 · 독서 모임' };

export default async function RatePage({ searchParams }: { searchParams: Promise<{ book?: string }> }) {
  const me = (await getCurrentMember())!;
  const { book: bookParam } = await searchParams;
  const data = await getClubData();

  // 평점은 책 상세에서 시작한다. 책 값이 없거나 잘못됐거나 읽은 책(done)이 아니면 책장으로 보낸다.
  const book = data.books.find((b) => b.id === bookParam && b.status === 'done');
  if (!book) redirect('/books');

  const mineForBook = data.ratings.find((r) => r.book_id === book.id && r.member_id === me.id);
  const myQuotes = data.quotes.filter((q) => q.book_id === book.id && q.member_id === me.id).map((q) => q.text);
  const existing = mineForBook ? { score: Number(mineForBook.score), review: mineForBook.review, quotes: myQuotes } : null;

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="w-24 shrink-0">
          <Cover title={book.title} authors={book.authors} genre={book.genre} coverPath={book.cover_path} />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 self-center">
          <h1 className="font-serif text-2xl font-bold leading-snug">{book.title}</h1>
          <p className="text-sm text-muted">{book.authors.join(', ') || '저자 정보 없음'}</p>
          <p className="text-sm font-medium text-accent">{existing ? '평점 고치기' : '평점 추가하기'}</p>
        </div>
      </div>
      <RatingForm bookId={book.id} existing={existing} />
    </div>
  );
}
