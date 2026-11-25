-- 할 일 알림의 "읽음"(숨김) 기록. 알림 자체는 저장하지 않고 볼 때마다 계산하므로(docs/features/notices.md), 멤버가 숨긴 알림 키만 남긴다.
-- 키는 진도 알림만 들어온다: 'progress:<책 id>:<주차>'. 주차가 키에 들어 있어서 다음 주차가 열리면 새 알림이 다시 보인다.
-- 같은 키를 다시 숨겨도 늘지 않게 (멤버, 키)가 기본 키다.
create table book_notice_dismissals (
  member_id uuid not null references book_members(id) on delete cascade,
  key text not null check (key ~ '^progress:[0-9a-f-]{36}:[1-9][0-9]{0,2}$'),
  dismissed_at timestamptz not null default now(),
  constraint book_notice_dismissals_pkey primary key (member_id, key)
);
alter table book_notice_dismissals enable row level security;
comment on table book_notice_dismissals is '[독서] 할 일 알림 숨김(읽음) 기록 (멤버 × 알림 키). 진도 알림 키만';
