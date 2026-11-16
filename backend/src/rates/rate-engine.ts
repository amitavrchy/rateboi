/**
 * Pure, deterministic rate engine (no I/O). Inputs come from published RateCards (or merchant overrides).
 * All money in poisha (integer). See PROJECT_SPEC.md §6.1.
 */
export type CodBase = 'PRODUCT_PRICE' | 'CASH_COLLECTED' | 'CASH_COLLECTED_MINUS_DELIVERY';

export interface SlabInput {
  routeClass: string;
  serviceLevel: string;
  maxWeightGrams: number;
  priceMinor: number;
  extraPerKgMinor?: number | null;
  etaHoursMin?: number | null;
  etaHoursMax?: number | null;
}

export interface RateCardInput {
  courier: string;
  vatIncluded: boolean;
  vatBps: number;
  codBps: number;
  codBpsDhakaMetro?: number | null;
  codBase: CodBase;
  codMinMinor?: number;
  /** basis points of delivery charge charged on return, per route class; default 0 */
  returnBpsByRoute?: Record<string, number>;
  slabs: SlabInput[];
}

export interface QuoteInput {
  routeClass: string;
  serviceLevel?: string;
  weightGrams: number;
  /** cash the rider collects (poisha) */
  codMinor: number;
  /** product price, used when codBase = PRODUCT_PRICE */
  productPriceMinor?: number;
  isDhakaMetroDelivery?: boolean;
  /** probability 0..1 the parcel returns (from risk model); default 0 */
  returnProbability?: number;
}

export interface Quote {
  courier: string;
  deliveryMinor: number;
  codChargeMinor: number;
  vatMinor: number;
  totalMinor: number;
  returnChargeMinor: number;
  /** total + P(return) × return charge — what we rank by */
  expectedCostMinor: number;
  etaHours: [number, number] | null;
  slabMaxWeightGrams: number;
}

export function quote(card: RateCardInput, input: QuoteInput): Quote | null {
  const service = input.serviceLevel ?? 'REGULAR';
  const slabs = card.slabs
    .filter((s) => s.routeClass === input.routeClass && s.serviceLevel === service)
    .sort((a, b) => a.maxWeightGrams - b.maxWeightGrams);
  if (slabs.length === 0 || input.weightGrams <= 0) return null;

  const fitting = slabs.find((s) => input.weightGrams <= s.maxWeightGrams);
  const last = slabs[slabs.length - 1];
  let deliveryMinor: number;
  let slab: SlabInput;
  if (fitting) {
    slab = fitting;
    deliveryMinor = fitting.priceMinor;
  } else {
    if (last.extraPerKgMinor == null) return null; // over max weight, no extra rule → not serviceable
    slab = last;
    const extraKg = Math.ceil((input.weightGrams - last.maxWeightGrams) / 1000);
    deliveryMinor = last.priceMinor + extraKg * last.extraPerKgMinor;
  }

  const codBps =
    input.isDhakaMetroDelivery && card.codBpsDhakaMetro != null ? card.codBpsDhakaMetro : card.codBps;
  let codBaseMinor: number;
  switch (card.codBase) {
    case 'PRODUCT_PRICE':
      codBaseMinor = input.productPriceMinor ?? input.codMinor;
      break;
    case 'CASH_COLLECTED_MINUS_DELIVERY':
      codBaseMinor = Math.max(0, input.codMinor - deliveryMinor);
      break;
    default:
      codBaseMinor = input.codMinor;
  }
  let codChargeMinor = input.codMinor > 0 ? Math.round((codBaseMinor * codBps) / 10_000) : 0;
  if (input.codMinor > 0 && card.codMinMinor) codChargeMinor = Math.max(codChargeMinor, card.codMinMinor);

  const vatMinor = card.vatIncluded ? 0 : Math.round(((deliveryMinor + codChargeMinor) * card.vatBps) / 10_000);
  const totalMinor = deliveryMinor + codChargeMinor + vatMinor;
  const returnBps = card.returnBpsByRoute?.[input.routeClass] ?? 0;
  const returnChargeMinor = Math.round((deliveryMinor * returnBps) / 10_000);
  const p = Math.min(1, Math.max(0, input.returnProbability ?? 0));
  const expectedCostMinor = Math.round(totalMinor + p * returnChargeMinor);

  return {
    courier: card.courier,
    deliveryMinor,
    codChargeMinor,
    vatMinor,
    totalMinor,
    returnChargeMinor,
    expectedCostMinor,
    etaHours: slab.etaHoursMin != null && slab.etaHoursMax != null ? [slab.etaHoursMin, slab.etaHoursMax] : null,
    slabMaxWeightGrams: slab.maxWeightGrams,
  };
}

/** Rank quotes: cheapest expected cost first; ties broken by faster max ETA. */
export function rankQuotes(quotes: Array<Quote | null>): Quote[] {
  return quotes
    .filter((q): q is Quote => q !== null)
    .sort(
      (a, b) =>
        a.expectedCostMinor - b.expectedCostMinor ||
        (a.etaHours?.[1] ?? Number.MAX_SAFE_INTEGER) - (b.etaHours?.[1] ?? Number.MAX_SAFE_INTEGER),
    );
}
