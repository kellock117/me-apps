'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@me/core/server/supabase';
import { getCurrentMember } from '@/lib/auth/member';
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@/lib/validation/push';

export type PushResult = { ok: true } | { ok: false; error: string };

const FAIL = '알림 설정을 저장하지 못했어요. 잠시 뒤에 다시 해 주세요';

/** 이 기기의 알림을 켠다(🔔 드롭다운). (멤버, 구독 주소) 기준으로 저장하므로 같은 기기에서 다시 켜도 한 줄이다. */
export async function savePushSubscription(input: unknown): Promise<PushResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: '로그인해 주세요' };
  const parsed = pushSubscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAIL };
  const { endpoint, keys } = parsed.data;
  const { error } = await createAdminClient()
    .from('book_push_subscriptions')
    .upsert({ member_id: me.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'member_id,endpoint' });
  if (error) return { ok: false, error: FAIL };
  revalidatePath('/', 'layout'); // 🔔의 켜짐 표시를 새로 그린다
  return { ok: true };
}

/** 이 기기의 알림을 끈다. 지금 멤버의 그 구독만 지우고, 같은 기기의 다른 멤버 구독은 건드리지 않는다. */
export async function removePushSubscription(input: unknown): Promise<PushResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: '로그인해 주세요' };
  const parsed = pushUnsubscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAIL };
  const { error } = await createAdminClient().from('book_push_subscriptions').delete().eq('member_id', me.id).eq('endpoint', parsed.data.endpoint);
  if (error) return { ok: false, error: FAIL };
  revalidatePath('/', 'layout');
  return { ok: true };
}
