-- 인상 깊은 문장을 평점당 하나(book_ratings.quote)에서 여러 개로 늘린다. 책 × 멤버 × 순서(ord)마다 한 줄.
-- 기존 quote 값은 첫 문장(ord 0)으로 옮기고 옛 열은 지운다.
create table book_quotes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references book_books(id) on delete cascade,
  member_id uuid not null references book_members(id) on delete cascade,
  ord int not null check (ord >= 0),
  text text not null check (char_length(btrim(text)) > 0 and char_length(text) <= 500),
  created_at timestamptz not null default now(),
  constraint book_quotes_book_member_ord_key unique (book_id, member_id, ord)
);
alter table book_quotes enable row level security;
comment on table book_quotes is '[독서] 인상 깊은 문장 (책 × 멤버 × 순서, 한 사람이 한 책에 여러 개)';

insert into book_quotes (book_id, member_id, ord, text)
select book_id, member_id, 0, btrim(quote) from book_ratings where quote is not null and btrim(quote) <> '';

alter table book_ratings drop column quote;
