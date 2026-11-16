/**
 * Bangladesh mobile normalisation. Accepts 01XXXXXXXXX, 1XXXXXXXXX, 8801XXXXXXXXX, +880 1XXX-XXXXXX,
 * and Bangla digits (০১৭…). Returns E.164 (+8801XXXXXXXXX) or null.
 */
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

export function normalizeBdPhone(input: string): string | null {
  const digits = toAsciiDigits(input).replace(/\D/g, '');
  let local: string;
  if (digits.startsWith('880')) local = '0' + digits.slice(3);
  else if (digits.startsWith('0')) local = digits;
  else local = '0' + digits;
  return /^01[3-9]\d{8}$/.test(local) ? `+88${local}` : null;
}

/** 01XXXXXXXXX form, which most courier APIs require (11 digits). */
export function toCourierPhone(e164: string): string {
  return e164.replace(/^\+88/, '');
}
