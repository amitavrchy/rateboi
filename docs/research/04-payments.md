# Payments (BD)

## bKash Tokenized Checkout (official developer portal)
Sources: https://developer.bka.sh/docs/tokenized-checkout-process , https://developer.bka.sh/docs/create-payment-1 , https://developer.bka.sh/docs/execute-payment-2
- Flow: grant token → `POST {base}/tokenized/checkout/create` (`mode:"0001"` agreement-based or non-agreement mode, `callbackURL, amount, currency:"BDT", intent:"Sale", merchantInvoiceNumber`) → redirect to `bkashURL` → callback → `POST {base}/tokenized/checkout/execute {paymentID}` → (query payment on timeout).
- Use for: RateBoi subscription payments (Pro plan), and optional "pay delivery charge in advance" links **only via the merchant's own bKash merchant account** (we must not hold merchant/customer funds — PSP licensing; verify with Bangladesh Bank rules).

## SSLCommerz v4
Sources: https://developer.sslcommerz.com/doc/v4/ , https://sandbox-gw.sslcommerz.com/doc/v4/order-validation.html , https://sandbox-gw.sslcommerz.com/doc/v4/ipn.html
- Session: `POST https://sandbox.sslcommerz.com/gwprocess/v4/api.php` (live `securepay.sslcommerz.com`) with `store_id, store_passwd, tran_id, total_amount, currency, success/fail/cancel_url, ipn_url` …
- IPN → server-side validation `GET /validator/api/validationserverAPI.php?val_id=…&store_id=…&store_passwd=…&format=json`; accept only `VALID`/`VALIDATED` and match tran_id + amount + currency.
- Use for: card/Nagad/Rocket/bank payments for subscriptions.

## Rules
- Money is integer **poisha** (`*Minor` columns). Never float.
- Idempotency: `Payment.tranId` unique; webhook/IPN dedupe; execute/validate before granting plan.
- Nagad direct integration: v2 (verify current merchant API docs).
