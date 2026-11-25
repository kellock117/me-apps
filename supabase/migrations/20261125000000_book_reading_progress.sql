-- 독서 진도: 읽는 중인 책을 주차별로 얼마나 읽었는지(누적 쪽수) 적는다. 책 × 멤버 × 주차마다 한 줄.
-- 주차 번호는 "전 모임일부터 7일씩 센 번호"라서, 모임일을 미뤄도 이미 쌓인 주차의 번호는 변하지 않는다.
-- 모임일을 당겨 기간 밖이 된 주차의 기록은 지우지 않고 화면에서만 숨긴다.
create table book_reading_progress (
  book_id uuid not null references book_books(id) on delete cascade,
  member_id uuid not null references book_members(id) on delete cascade,
  week int not null check (week >= 1),
  pages int not null check (pages >= 0),
  updated_at timestamptz not null default now(),
  constraint book_reading_progress_pkey primary key (book_id, member_id, week)
);
alter table book_reading_progress enable row level security;
comment on table book_reading_progress is '[독서] 읽기 진도 (책 × 멤버 × 주차, 누적 쪽수). 주차 = 전 모임일부터 7일 단위 번호';

create trigger book_reading_progress_set_updated_at
  before update on book_reading_progress
  for each row execute function set_updated_at();
