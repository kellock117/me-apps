-- 웹 푸시 구독(기기 하나 = 한 줄). 멤버가 🔔 드롭다운에서 "이 기기에서 알림 켜기"를 누르면 저장한다(docs/features/push.md).
-- endpoint는 브라우저 푸시 서비스가 정한 주소, p256dh·auth는 그 기기만 풀 수 있는 암호화 키다. 셋 다 비밀로 다루고 화면에 내보내지 않는다.
-- 같은 기기에서 멤버를 바꿔 켜면 (멤버, 주소)가 달라 따로 저장된다. 멤버를 지우면 구독도 함께 지워진다.
create table book_push_subscriptions (
  member_id uuid not null references book_members(id) on delete cascade,
  endpoint text not null check (endpoint ~ '^https://' and length(endpoint) <= 2048),
  p256dh text not null check (length(p256dh) between 1 and 512),
  auth text not null check (length(auth) between 1 and 512),
  created_at timestamptz not null default now(),
  constraint book_push_subscriptions_pkey primary key (member_id, endpoint)
);
alter table book_push_subscriptions enable row level security;
comment on table book_push_subscriptions is '[독서] 웹 푸시 구독 (멤버 × 기기). 알림 켜기로 저장, 404/410이면 보낼 때 지움. 백업 제외';
