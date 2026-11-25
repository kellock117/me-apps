'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@me/core/server/supabase';
import { getCurrentMember } from '@/lib/auth/member';
import { dismissKeySchema, dismissKeysSchema } from '@/lib/validation/notice';

export type DismissResult = { ok: true } | { ok: false; error: string };

const FAIL = '알림을 숨기지 못했어요. 잠시 뒤에 다시 해 주세요';

/** 진도 알림 하나를 "읽음"으로 숨긴다(🔔 드롭다운의 "읽음"). 평점 키·모양이 틀린 키는 거절한다. 같은 키를 다시 보내도 오류가 없다. */
export async function dismissNotice(key: string): Promise<DismissResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: '로그인해 주세요' };
  const parsed = dismissKeySchema.safeParse(key);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAIL };
  return save(me.id, [parsed.data]);
}

/** 진도 알림 여러 개를 한 번에 숨긴다(🔔 드롭다운의 "모두 읽음"). 평점 알림은 화면이 보내지 않고, 섞여 오면 통째로 거절한다. */
export async function dismissAllNotices(keys: string[]): Promise<DismissResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: '로그인해 주세요' };
  const parsed = dismissKeysSchema.safeParse(keys);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? FAIL };
  return save(me.id, [...new Set(parsed.data)]);
}

/** (멤버, 키)가 기본 키라 이미 있으면 그대로 둔다(멱등). */
async function save(memberId: string, keys: string[]): Promise<DismissResult> {
  const { error } = await createAdminClient()
    .from('book_notice_dismissals')
    .upsert(
      keys.map((key) => ({ member_id: memberId, key })),
      { onConflict: 'member_id,key', ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: FAIL };
  revalidatePath('/', 'layout'); // 🔔 배지·드롭다운·할 일 모달을 새 목록으로
  return { ok: true };
}
