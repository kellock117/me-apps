import 'server-only';
import { todayInSeoul } from '@me/core/date';
import { loadPlanData } from './data';
import { deliverPushes } from './deliver';
import { planPushes, type PlanKind } from './plan';

/**
 * 모임 저장 직후 새 모임·날짜 변경 알림을 바로 보낸다(#59). 호출한 쪽은 저장이 끝난 뒤에 부른다.
 * 어떤 실패도 던지지 않고 로그만 남긴다: 알림 때문에 이미 저장된 모임의 결과가 바뀌면 안 된다.
 */
export async function notifyMeetingChange(kind: Extract<PlanKind, { type: 'meeting-new' | 'meeting-datechange' }>): Promise<void> {
  try {
    const pushes = planPushes({ kind, today: todayInSeoul(new Date()), ...(await loadPlanData()) });
    await deliverPushes(pushes);
  } catch (e) {
    console.error('모임 알림 발송 실패', e);
  }
}
