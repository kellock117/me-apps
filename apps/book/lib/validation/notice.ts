import { z } from 'zod';

/**
 * 숨길 수 있는 알림 키: 진도 알림 `progress:<책 uuid>:<주차>`만(lib/notices.ts). 평점 알림(`rate:…`)은 숨길 수 없어 거절한다.
 * DB의 check 제약(book_notice_dismissals.key)과 같은 모양이다.
 */
export const dismissKeySchema = z.string().regex(/^progress:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[1-9]\d{0,2}$/, '숨길 수 없는 알림이에요');

/** "모두 읽음": 진도 키 1~50개. 하나라도 틀리면 통째로 거절한다. */
export const dismissKeysSchema = z.array(dismissKeySchema).min(1, '숨길 알림이 없어요').max(50, '한 번에 숨길 수 있는 알림이 너무 많아요');
