'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentMember } from '@/lib/auth/member';
import { notifyMeetingChange } from '@/lib/push/notify';
import { createAdminClient } from '@me/core/server/supabase';
import { meetingSchema } from '@/lib/validation/book';

export type MeetingState = {
  errors?: Record<string, string[]>;
  values?: { date: string; questions: string; attendees: string[] };
};

const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : '');

export async function saveMeeting(_prev: MeetingState, formData: FormData): Promise<MeetingState> {
  const raw = {
    id: str(formData.get('id')),
    date: str(formData.get('date')),
    questions: str(formData.get('questions')),
    attendees: formData.getAll('attendees').filter((v): v is string => typeof v === 'string'),
    intent: str(formData.get('intent')),
  };
  const values = { date: raw.date, questions: raw.questions, attendees: raw.attendees };

  const me = await getCurrentMember();
  if (!me) redirect('/who');

  const parsed = meetingSchema.safeParse(raw);
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  const input = parsed.data;

  const db = createAdminClient();
  const { data: meeting } = await db.from('book_meetings').select('id,book_id,date').eq('id', input.id).maybeSingle();
  if (!meeting) return { errors: { form: ['없는 모임이에요'] }, values };

  // 활동 중인 멤버만 참석자로 받는다
  const { data: active } = await db.from('book_members').select('id').eq('status', 'active');
  const activeIds = new Set((active ?? []).map((m) => m.id));
  const attendees = [...new Set(input.attendees)].filter((id) => activeIds.has(id));

  const { error } = await db.from('book_meetings').update({ date: input.date, questions: input.questions }).eq('id', input.id);
  if (error) return { errors: { form: ['저장하지 못했어요. 잠시 뒤에 다시 해 주세요'] }, values };

  // 참석자: 비교해서 빠진 사람은 지우고 새로 온 사람은 넣는다
  const { data: current } = await db.from('book_meeting_attendees').select('member_id').eq('meeting_id', input.id);
  const have = new Set((current ?? []).map((a) => a.member_id));
  const toRemove = [...have].filter((id) => !attendees.includes(id));
  const toAdd = attendees.filter((id) => !have.has(id));
  if (toRemove.length) await db.from('book_meeting_attendees').delete().eq('meeting_id', input.id).in('member_id', toRemove);
  if (toAdd.length) {
    const { error: addError } = await db.from('book_meeting_attendees').insert(toAdd.map((member_id) => ({ meeting_id: input.id, member_id })));
    if (addError) return { errors: { form: ['참석자를 저장하지 못했어요. 다시 해 주세요'] }, values };
  }

  // 알림은 모든 저장(참석자·완료 처리 포함)이 성공한 맨 끝에서, 날짜가 실제로 바뀌었을 때만 보낸다. 중간에 실패해 오류를 보여 줬는데 알림만 나가는 일이 없게 한다. 실패해도 저장 결과는 그대로다.
  const notifyDateChange = async () => {
    if (meeting.date !== input.date) await notifyMeetingChange({ type: 'meeting-datechange', meetingId: input.id, oldDate: meeting.date });
  };

  if (input.intent === 'finish') {
    if (!meeting.book_id) return { errors: { form: ['이 모임에는 책이 정해져 있지 않아요'] }, values };
    const { error: doneError } = await db.from('book_books').update({ status: 'done' }).eq('id', meeting.book_id);
    if (doneError) return { errors: { form: ['책 상태를 바꾸지 못했어요. 다시 해 주세요'] }, values };
    await notifyDateChange();
    revalidatePath('/', 'layout');
    redirect(`/rate?book=${meeting.book_id}`);
  }

  await notifyDateChange();
  revalidatePath('/', 'layout');
  redirect('/meetings?toast=saved');
}
