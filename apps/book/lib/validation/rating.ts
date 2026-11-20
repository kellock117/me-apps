import { z } from 'zod';

export const REVIEW_MAX = 1000;
export const QUOTE_MAX = 500;
/** 서버 안전장치. 화면에는 개수 제한 문구를 보여 주지 않는다(스펙). */
export const QUOTES_MAX_COUNT = 50;

/** 평점 입력. 별점은 0.5~5, 0.5 단위 (DB 제약과 같은 규칙). */
export const ratingInputSchema = z.object({
  bookId: z.string().uuid('책을 골라 주세요'),
  // 빈 값("")이 0으로 바뀌어 "0.5점 이상" 메시지가 나오지 않도록 먼저 비어 있는지 본다
  score: z
    .string('별점을 골라 주세요')
    .trim()
    .min(1, '별점을 골라 주세요')
    .transform((s) => Number(s))
    .pipe(
      z
        .number('별점을 골라 주세요')
        .min(0.5, '별점은 0.5점 이상이에요')
        .max(5, '별점은 5점 이하예요')
        .refine((n) => Number.isInteger(n * 2), '별점은 0.5점 단위예요'),
    ),
  // 리뷰는 선택. 줄바꿈은 그대로 두고 앞뒤 공백만 자른다. 비어 있으면 빈 문자열.
  review: z
    .string()
    .transform((s) => s.replace(/\r\n?/g, '\n')) // 폼 전송은 줄바꿈을 \r\n으로 보낸다. 입력칸이 센 글자 수와 같게 \n 하나로 통일
    .pipe(z.string().trim().max(REVIEW_MAX, `리뷰는 ${REVIEW_MAX}자까지예요`)),
  // 인상 깊은 문장(여러 개). 앞뒤 공백을 자르고 빈 칸은 건너뛴다. 모두 비워도 된다(내 문장이 모두 지워진다).
  quotes: z
    .array(z.string().transform((s) => s.replace(/\r\n?/g, '\n').trim()))
    .transform((arr) => arr.filter((q) => q !== ''))
    .pipe(
      z
        .array(z.string().max(QUOTE_MAX, `인상 깊은 문장은 ${QUOTE_MAX}자까지예요`))
        .max(QUOTES_MAX_COUNT, '문장이 너무 많아요. 조금 줄여 주세요'),
    ),
});

export type RatingInput = z.infer<typeof ratingInputSchema>;
