-- 푸시 보낸 기록(멤버 × 알림 키). 같은 키는 다시 보내지 않아서 크론이 다시 돌아도 알림이 겹치지 않는다(docs/features/push.md).
-- 키 모양: weekly:<모임 id>:<날짜> (이후 티켓에서 meetingday·meeting·datechange가 더해진다). 발송이 성공한 뒤에만 남기고, 테스트 푸시는 남기지 않는다.
-- 일시 데이터라 백업에 넣지 않는다.
create table book_push_sent (
  member_id uuid not null references book_members(id) on delete cascade,
  key text not null check (length(key) between 1 and 200),
  sent_at timestamptz not null default now(),
  constraint book_push_sent_pkey primary key (member_id, key)
);
alter table book_push_sent enable row level security;
comment on table book_push_sent is '[독서] 푸시 보낸 기록 (멤버 × 알림 키). 같은 알림 중복 방지용 일시 데이터. 백업 제외';
