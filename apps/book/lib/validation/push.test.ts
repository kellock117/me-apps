import { describe, expect, it } from 'vitest';
import { pushSubscribeSchema, pushUnsubscribeSchema } from './push';

const ok = { endpoint: 'https://push.example.com/send/abc123', keys: { p256dh: 'BPxx', auth: 'aa-bb' } };

describe('pushSubscribeSchema', () => {
  it('브라우저 구독 모양을 통과시킨다', () => {
    expect(pushSubscribeSchema.safeParse(ok).success).toBe(true);
  });
  it('https가 아닌 주소는 거절한다', () => {
    expect(pushSubscribeSchema.safeParse({ ...ok, endpoint: 'http://push.example.com/x' }).success).toBe(false);
    expect(pushSubscribeSchema.safeParse({ ...ok, endpoint: 'javascript:alert(1)' }).success).toBe(false);
  });
  it('주소가 너무 길면 거절한다', () => {
    expect(pushSubscribeSchema.safeParse({ ...ok, endpoint: `https://push.example.com/${'a'.repeat(2100)}` }).success).toBe(false);
  });
  it('키가 없거나 비었거나 너무 길면 거절한다', () => {
    expect(pushSubscribeSchema.safeParse({ endpoint: ok.endpoint }).success).toBe(false);
    expect(pushSubscribeSchema.safeParse({ ...ok, keys: { p256dh: '', auth: 'x' } }).success).toBe(false);
    expect(pushSubscribeSchema.safeParse({ ...ok, keys: { p256dh: 'x', auth: 'a'.repeat(513) } }).success).toBe(false);
  });
});

describe('pushUnsubscribeSchema', () => {
  it('주소 하나를 받는다', () => {
    expect(pushUnsubscribeSchema.safeParse({ endpoint: ok.endpoint }).success).toBe(true);
    expect(pushUnsubscribeSchema.safeParse({ endpoint: '' }).success).toBe(false);
  });
});
