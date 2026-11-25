import 'server-only';
import { sendNotification, setVapidDetails } from 'web-push';
import { createAdminClient } from '@me/core/server/supabase';

/** 푸시 하나의 내용. 서비스 워커(public/sw.js)가 이 모양으로 받는다. url은 같은 사이트 안의 경로(`/books/…`). */
export type PushPayload = { title: string; body: string; url: string };

export type PushResult = { sent: number; removed: number; failed: number };

/** 푸시 서비스가 응답하지 않을 때 기다리는 한계. 모임 저장·크론이 한 기기 때문에 멈추지 않게 한다(넘으면 실패로 센다). */
const PUSH_TIMEOUT_MS = 8000;

let configured = false;

/** VAPID 환경 변수가 모두 있을 때만 설정한다. 없으면 false(발송하지 않는다). */
function configure(): boolean {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subject } = process.env;
  if (!pub || !priv || !subject) return false;
  setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** 브라우저 푸시 서비스가 "이 구독은 이제 없다"고 답하는 상태 코드. */
export const isGoneStatus = (status: number | undefined) => status === 404 || status === 410;

/**
 * 한 멤버의 모든 기기에 푸시를 보낸다. 404/410이면 그 구독을 지우고, 그 밖의 실패는 로그만 남긴다(던지지 않는다).
 * 알림 때문에 호출한 쪽의 작업(모임 저장 등)이 실패하면 안 되기 때문이다.
 */
export async function sendPushToMember(memberId: string, payload: PushPayload): Promise<PushResult> {
  const result: PushResult = { sent: 0, removed: 0, failed: 0 };
  if (!configure()) {
    console.error('[push] VAPID 환경 변수(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)가 없어 보내지 않아요');
    return result;
  }
  const db = createAdminClient();
  const { data: subs, error } = await db.from('book_push_subscriptions').select('endpoint, p256dh, auth').eq('member_id', memberId);
  if (error) {
    console.error('[push] 구독을 읽지 못했어요', error.message);
    return result;
  }
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12, timeout: PUSH_TIMEOUT_MS });
        result.sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (isGoneStatus(status)) {
          await db.from('book_push_subscriptions').delete().eq('member_id', memberId).eq('endpoint', s.endpoint);
          result.removed += 1;
        } else {
          console.error('[push] 보내지 못했어요', status ?? (e as Error).message);
          result.failed += 1;
        }
      }
    }),
  );
  return result;
}
