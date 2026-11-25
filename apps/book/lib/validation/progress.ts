import { z } from 'zod';

/** 진도 입력(서버 액션이 받은 값). 쪽수는 숫자만 있는 문자열이어야 하고(소수·음수·빈 값 거부), 범위·완독은 reading-progress.ts가 따로 본다. */
export const progressInputSchema = z.object({
  bookId: z.string().uuid('책을 골라 주세요'),
  week: z
    .string()
    .regex(/^\d{1,3}$/, '주차를 알 수 없어요')
    .transform(Number)
    .pipe(z.number().int().min(1, '주차를 알 수 없어요')),
  pages: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, '읽은 쪽수를 0 이상의 숫자로 적어 주세요')
    .transform(Number),
});
