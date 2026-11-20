-- 한 줄 평(one_liner, 80자)을 여러 줄 리뷰(review, 1000자, 선택)로 바꾼다.
-- 기존 값은 모두 review로 옮기고 옛 열은 지운다. 리뷰를 안 쓴 평점은 빈 문자열이다(null 없음).
alter table book_ratings add column review text not null default '' check (char_length(review) <= 1000);
update book_ratings set review = coalesce(one_liner, '');
alter table book_ratings drop column one_liner;
comment on table book_ratings is '[독서] 평점·리뷰 (책 × 멤버, 한 사람이 한 책에 하나)';
