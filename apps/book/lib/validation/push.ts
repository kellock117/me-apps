import { z } from 'zod';

/** 브라우저가 알려 주는 구독 주소. 푸시 서비스는 모두 https라서 그 밖의 값은 거절한다(DB check 제약과 같은 기준). */
const endpointSchema = z.url({ protocol: /^https$/, error: '구독 주소가 올바르지 않아요' }).max(2048, '구독 주소가 너무 길어요');

/** 암호화 키(base64url 문자열). 모양까지는 보지 않고 비어 있거나 터무니없이 긴 값만 거른다. */
const keySchema = z.string().min(1, '구독 키가 비어 있어요').max(512, '구독 키가 너무 길어요');

/** 알림 켜기: 브라우저 `PushSubscription.toJSON()`이 주는 모양. */
export const pushSubscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({ p256dh: keySchema, auth: keySchema }),
});

/** 알림 끄기: 구독 주소 하나. */
export const pushUnsubscribeSchema = z.object({ endpoint: endpointSchema });
