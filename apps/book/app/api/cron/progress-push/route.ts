import { safeEqual } from '@me/core/auth/session';
import { todayInSeoul } from '@me/core/date';
import { loadPlanData } from '@/lib/push/data';
import { deliverPushes } from '@/lib/push/deliver';
import { planPushes } from '@/lib/push/plan';

export const dynamic = 'force-dynamic';

/**
 * Vercel Cron이 매일 한국 시간 18시(vercel.json의 `0 9 * * *` = UTC 9시)에 한 번 호출한다.
 * Hobby 플랜 크론은 지정한 시(hour) 안의 아무 때나 실행되므로 18:00~18:59 사이에 돈다.
 * 돌 때마다 DB의 모임으로 오늘 보낼 푸시를 다시 계산하고(planPushes), 알림을 켠 활동 멤버의 기기에 보낸다.
 * 같은 날 다시 호출해도 보낸 기록(book_push_sent) 때문에 같은 알림이 두 번 가지 않는다.
 * Authorization: Bearer ${CRON_SECRET}이 아니면 401.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response('Unauthorized', { status: 401 });

  try {
    const today = todayInSeoul(new Date());
    const pushes = planPushes({ kind: { type: 'daily' }, today, ...(await loadPlanData()) });
    const results = await deliverPushes(pushes);
    const total = (k: 'sent' | 'removed' | 'failed') => results.reduce((n, r) => n + r[k], 0);
    return Response.json({ ok: true, today, planned: pushes.length, sent: total('sent'), removed: total('removed'), failed: total('failed') });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
