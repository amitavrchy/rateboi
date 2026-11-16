import { quote, rankQuotes, type RateCardInput } from './rate-engine.js';

// Pathao list rates (help.pathao.com, May 2026), VAT excluded; values in poisha.
const pathao: RateCardInput = {
  courier: 'PATHAO',
  vatIncluded: false,
  vatBps: 1500,
  codBps: 100,
  codBase: 'PRODUCT_PRICE',
  returnBpsByRoute: { DHAKA_TO_OUTSIDE: 5000 },
  slabs: [
    { routeClass: 'DHAKA_TO_OUTSIDE', serviceLevel: 'REGULAR', maxWeightGrams: 500, priceMinor: 11000 },
    { routeClass: 'DHAKA_TO_OUTSIDE', serviceLevel: 'REGULAR', maxWeightGrams: 1000, priceMinor: 13000 },
    { routeClass: 'DHAKA_TO_OUTSIDE', serviceLevel: 'REGULAR', maxWeightGrams: 2000, priceMinor: 17000, extraPerKgMinor: 2500, etaHoursMin: 48, etaHoursMax: 72 },
  ],
};

// RedX list rates (VAT included), COD 1% outside Dhaka.
const redx: RateCardInput = {
  courier: 'REDX',
  vatIncluded: true,
  vatBps: 1500,
  codBps: 100,
  codBpsDhakaMetro: 0,
  codBase: 'CASH_COLLECTED',
  slabs: [
    { routeClass: 'DHAKA_TO_OUTSIDE', serviceLevel: 'REGULAR', maxWeightGrams: 1000, priceMinor: 12000 },
    { routeClass: 'DHAKA_TO_OUTSIDE', serviceLevel: 'REGULAR', maxWeightGrams: 2000, priceMinor: 15000, extraPerKgMinor: 3000 },
  ],
};

describe('rate engine', () => {
  it('picks the right slab and adds COD + VAT', () => {
    const q = quote(pathao, { routeClass: 'DHAKA_TO_OUTSIDE', weightGrams: 800, codMinor: 150000 });
    expect(q?.deliveryMinor).toBe(13000);
    expect(q?.codChargeMinor).toBe(1500);
    expect(q?.vatMinor).toBe(Math.round((13000 + 1500) * 0.15));
  });

  it('charges extra per started kg above last slab', () => {
    const q = quote(pathao, { routeClass: 'DHAKA_TO_OUTSIDE', weightGrams: 3200, codMinor: 0 });
    expect(q?.deliveryMinor).toBe(17000 + 2 * 2500);
    expect(q?.codChargeMinor).toBe(0);
  });

  it('includes expected return cost in ranking', () => {
    const input = { routeClass: 'DHAKA_TO_OUTSIDE', weightGrams: 1000, codMinor: 200000, returnProbability: 0.3 };
    const ranked = rankQuotes([quote(pathao, input), quote(redx, input)]);
    expect(ranked[0].courier).toBe('REDX');
    expect(ranked[1].expectedCostMinor).toBeGreaterThan(ranked[1].totalMinor);
  });

  it('returns null for unknown route', () => {
    expect(quote(redx, { routeClass: 'SAME_CITY', weightGrams: 500, codMinor: 0 })).toBeNull();
  });
});
