import { canTransition } from './courier-adapter.js';

describe('shipment status machine', () => {
  it('moves forward', () => expect(canTransition('PICKED_UP', 'OUT_FOR_DELIVERY')).toBe(true));
  it('ignores regressions', () => expect(canTransition('DELIVERED', 'OUT_FOR_DELIVERY')).toBe(false));
  it('allows re-attempt after hold', () => expect(canTransition('ON_HOLD', 'OUT_FOR_DELIVERY')).toBe(true));
  it('never applies UNKNOWN', () => expect(canTransition('CREATED', 'UNKNOWN')).toBe(false));
});
