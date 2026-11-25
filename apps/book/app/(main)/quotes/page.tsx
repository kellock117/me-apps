import type { Metadata } from 'next';
import { QuoteView } from '@/components/quote-view';
import { Card } from '@me/ui/section';
import { getDailyQuote } from './actions';

export const metadata: Metadata = { title: '문장 · 독서 모임' };

/** 문장 탭. 멤버가 남긴 인상 깊은 문장을 하나씩 본다. 처음은 서울 날짜 기준 오늘의 문장이다. 게스트도 본다. */
export default async function QuotesPage() {
  const first = await getDailyQuote([]);
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold">오늘의 문장</h1>
      {first ? <QuoteView initial={first} /> : <Card className="text-center text-muted">아직 남긴 문장이 없어요</Card>}
    </div>
  );
}
