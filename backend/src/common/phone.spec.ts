import { normalizeBdPhone, toCourierPhone } from './phone.js';

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['+880 1712-345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['1712345678', '+8801712345678'],
    ['০১৭১২৩৪৫৬৭৮', '+8801712345678'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each(['0171234567', '01212345678', 'abc', ''])('rejects %s', (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });

  it('formats for courier APIs', () => {
    expect(toCourierPhone('+8801712345678')).toBe('01712345678');
  });
});
