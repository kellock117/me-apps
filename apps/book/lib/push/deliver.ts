import 'server-only';
import { createAdminClient } from '@me/core/server/supabase';
import type { PlannedPush } from './plan';
import { sendPushToMember, type PushResult } from './send';

/**
 * 계산된 푸시를 차례로 보내고, 기록 키가 있는 것은 발송이 성공한 뒤에 보낸 기록을 남긴다.
 * 기기가 하나도 없거나(sent 0) 모두 실패하면 기록하지 않는다. 기록이 안 남으면 같은 키를 다시 보낼 수 있다(중복보다 빠짐이 더 나쁘다).
 * 기록 저장이 실패하면 로그만 남기고 계속한다(이미 보낸 알림은 되돌릴 수 없다).
 */
export async function deliverPushes(pushes: PlannedPush[]): Promise<(PushResult & { memberId: string })[]> {
  const db = createAdminClient();
  const results: (PushResult & { memberId: string })[] = [];
  for (const p of pushes) {
    const r = await sendPushToMember(p.memberId, { title: p.title, body: p.body, url: p.url });
    results.push({ memberId: p.memberId, ...r });
    if (p.key && r.sent > 0) {
      const { error } = await db.from('book_push_sent').upsert({ member_id: p.memberId, key: p.key }, { onConflict: 'member_id,key', ignoreDuplicates: true });
      if (error) console.error('푸시 보낸 기록 저장 실패', error.message);
    }
  }
  return results;
}
