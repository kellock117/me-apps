import { expect, it } from 'vitest';

// 규칙 확인용(머지하지 않는다): verify가 실패하면 main으로 머지되지 않는지 본다.
it('일부러 실패', () => {
  expect(1).toBe(2);
});
