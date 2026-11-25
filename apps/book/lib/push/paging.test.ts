import { describe, expect, it } from 'vitest';
import { readAllPages } from './paging';

const table = (n: number) => Array.from({ length: n }, (_, i) => i);
const source = (rows: number[]) => async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });

describe('readAllPages', () => {
  it('상한을 넘는 행도 모두 읽는다', async () => {
    expect(await readAllPages('t', source(table(2500)), 1000)).toHaveLength(2500);
  });
  it('딱 페이지 크기만큼이어도 끝에서 멈춘다', async () => {
    expect(await readAllPages('t', source(table(2000)), 1000)).toHaveLength(2000);
  });
  it('빈 표는 빈 배열', async () => {
    expect(await readAllPages('t', source([]), 1000)).toEqual([]);
  });
  it('읽기에 실패하면 어느 표인지 담아 던진다', async () => {
    await expect(readAllPages('ratings', async () => ({ data: null, error: { message: 'boom' } }))).rejects.toThrow('ratings: boom');
  });
});
