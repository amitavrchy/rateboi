/**
 * Contract every courier integration implements. Adapters live in src/couriers/<code>/.
 * Endpoints per courier: docs/research/01-courier-apis.md (anything marked "verify" must be confirmed in sandbox first).
 */
export type NormalizedStatus =
  | 'CREATED' | 'PICKUP_PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'AT_HUB' | 'OUT_FOR_DELIVERY' | 'ON_HOLD'
  | 'DELIVERED' | 'PARTIAL_DELIVERED' | 'RETURNING' | 'RETURNED' | 'CANCELLED' | 'LOST' | 'UNKNOWN';

export interface CourierCredentials { [key: string]: string }

export interface CreateShipmentInput {
  invoice: string; // idempotency key, unique per courier account
  recipientName: string;
  recipientPhone: string; // 01XXXXXXXXX
  altPhone?: string;
  address: string;
  courierAreaIds: Record<string, string>; // e.g. { city: '1', zone: '52', area: '…' } or { area: '…' }
  codAmountMinor: number;
  declaredValueMinor: number;
  weightGrams: number;
  itemDescription?: string;
  note?: string;
  pickupStoreExternalId?: string;
  serviceLevel: 'REGULAR' | 'EXPRESS' | 'ON_DEMAND' | 'POINT_DELIVERY';
  kind: 'REGULAR' | 'REVERSE' | 'EXCHANGE_DELIVERY';
}

export interface CreateShipmentResult {
  externalId: string;
  trackingCode?: string;
  trackingUrl?: string;
  deliveryFeeMinor?: number;
  raw: unknown;
}

export interface StatusResult {
  rawStatus: string;
  status: NormalizedStatus;
  occurredAt: Date;
  codCollectedMinor?: number;
  raw: unknown;
}

export interface CourierQuoteResult { deliveryMinor: number; codChargeMinor: number; raw: unknown }

export class CourierTimeoutError extends Error {
  constructor(message: string, readonly operation: 'create' | 'read') {
    super(message);
  }
}

export interface CourierAdapter {
  readonly code: string;
  verifyCredentials(creds: CourierCredentials): Promise<boolean>;
  /** live quote when the courier exposes one (RedX charge calculator, Pathao price-plan); else null → use rate card */
  quote?(creds: CourierCredentials, input: Omit<CreateShipmentInput, 'invoice' | 'recipientName' | 'recipientPhone' | 'address'>): Promise<CourierQuoteResult | null>;
  createShipment(creds: CourierCredentials, input: CreateShipmentInput): Promise<CreateShipmentResult>;
  /** used to reconcile UNCERTAIN bookings (Steadfast status_by_invoice; others: verify) */
  findByInvoice?(creds: CourierCredentials, invoice: string): Promise<CreateShipmentResult | null>;
  getStatus(creds: CourierCredentials, externalId: string): Promise<StatusResult>;
  cancel?(creds: CourierCredentials, externalId: string, reason: string): Promise<void>;
  listAreas?(creds: CourierCredentials): AsyncIterable<{ kind: string; externalId: string; name: string; parentExternalId?: string; postCode?: string; districtName?: string }>;
  normalizeStatus(rawStatus: string): NormalizedStatus;
  /** verify inbound webhook (signature / token) and parse to status events */
  parseWebhook?(headers: Record<string, string | string[] | undefined>, body: unknown, secret: string): { valid: boolean; externalId?: string; invoice?: string; rawStatus?: string; occurredAt?: Date };
}

/** Forward-only status progression; regressions are logged but not applied. */
const RANK: Record<NormalizedStatus, number> = {
  CREATED: 0, PICKUP_PENDING: 1, PICKED_UP: 2, IN_TRANSIT: 3, AT_HUB: 3, ON_HOLD: 4, OUT_FOR_DELIVERY: 5,
  RETURNING: 6, DELIVERED: 7, PARTIAL_DELIVERED: 7, RETURNED: 8, CANCELLED: 8, LOST: 8, UNKNOWN: -1,
};

export function canTransition(from: NormalizedStatus, to: NormalizedStatus): boolean {
  if (to === 'UNKNOWN') return false;
  if (from === to) return false;
  if (from === 'ON_HOLD' && to === 'OUT_FOR_DELIVERY') return true; // re-attempt
  return RANK[to] > RANK[from];
}
