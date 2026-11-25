-- 모임은 늘 디스코드에서 하므로 쓰지 않는 장소 칸을 지운다(#54).
-- 되돌릴 수 없다: 옛 값은 백업 파일(12주 보관)에만 남고, 옛 백업을 복원할 때는 place가 버려진다(dropLegacyMeetingPlace).
alter table book_meetings drop column place;
