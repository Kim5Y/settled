-- ============================================================
-- PayFlow: payment tracking and verification backend
-- PostgreSQL 14+
-- ============================================================
-- Conventions
--   * All money is stored as integers in MINOR units (kobo, cents).
--     Zero-decimal currencies (e.g. JPY) store the whole amount.
--     Conversion lives in application code, never in the database.
--   * Every money column has a currency code beside it (ISO 4217).
--   * Order and payment statuses are provider-neutral. Each provider
--     adapter maps its own events onto these states.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
CREATE TYPE payment_provider AS ENUM ('stripe', 'paystack', 'flutterwave');

CREATE TYPE order_status AS ENUM (
  'pending',             -- created, not yet paid
  'paid',                -- verified payment received
  'failed',              -- every attempt failed or expired
  'cancelled',           -- cancelled before payment
  'partially_refunded',
  'refunded'
);

CREATE TYPE payment_status AS ENUM (
  'initiated',           -- row created, provider session being created
  'pending',             -- customer sent to checkout, awaiting result
  'succeeded',
  'failed',
  'abandoned',           -- checkout expired or customer left
  'refunded',
  'partially_refunded'
);

CREATE TYPE refund_status AS ENUM ('pending', 'succeeded', 'failed');

CREATE TYPE webhook_status AS ENUM (
  'received',            -- stored, not yet processed
  'processed',
  'ignored',             -- duplicate, unknown event type, or unmatched reference
  'failed'               -- processing raised an error, eligible for retry
);

CREATE TYPE status_source AS ENUM ('api', 'webhook', 'reconciliation', 'manual');

-- ------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
CREATE TABLE orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       text NOT NULL UNIQUE,            -- public order number, e.g. ORD-20261026-0001
  customer_email  text NOT NULL,
  customer_name   text,
  external_customer_id text,
  public_token    text NOT NULL UNIQUE,
  description     text,
  amount_minor    bigint NOT NULL CHECK (amount_minor > 0),
  currency        char(3) NOT NULL CHECK (currency = upper(currency)),
  status          order_status NOT NULL DEFAULT 'pending',
  paid_at         timestamptz,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- paid_at must be set exactly when the order has been paid
  CONSTRAINT orders_paid_at_matches_status CHECK (
    (status IN ('paid', 'partially_refunded', 'refunded')) = (paid_at IS NOT NULL)
  )
);

CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX orders_customer_email_idx ON orders (customer_email);
CREATE INDEX orders_external_customer_idx ON orders (external_customer_id);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- payments: one row per payment attempt against an order
-- ------------------------------------------------------------
CREATE TABLE payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 uuid NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
  provider                 payment_provider NOT NULL,

  -- Our reference, sent to the provider so webhooks can be matched back.
  provider_reference       text NOT NULL,
  -- The provider's own transaction/payment-intent id, known after checkout starts or completes.
  provider_transaction_id  text,

  -- Client-supplied key so retrying "create payment" never creates two attempts.
  idempotency_key          text,

  amount_minor             bigint NOT NULL CHECK (amount_minor > 0),
  currency                 char(3) NOT NULL CHECK (currency = upper(currency)),
  -- What the provider says it actually collected, used to catch mismatched or partial payments.
  amount_received_minor    bigint CHECK (amount_received_minor >= 0),

  status                   payment_status NOT NULL DEFAULT 'initiated',
  channel                  text,                    -- card, bank_transfer, ussd, ...
  checkout_url             text,
  failure_reason           text,
  expires_at               timestamptz,
  paid_at                  timestamptz,

  -- Reconciliation bookkeeping
  last_reconciled_at       timestamptz,
  reconcile_attempts       integer NOT NULL DEFAULT 0 CHECK (reconcile_attempts >= 0),

  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payments_provider_reference_uniq UNIQUE (provider, provider_reference),
  CONSTRAINT payments_paid_at_matches_status CHECK (
    (status IN ('succeeded', 'refunded', 'partially_refunded')) = (paid_at IS NOT NULL)
  )
);

-- Provider transaction ids are unique per provider once known
CREATE UNIQUE INDEX payments_provider_txn_uniq
  ON payments (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

-- Retrying "create payment" with the same key returns the same attempt
CREATE UNIQUE INDEX payments_idempotency_key_uniq
  ON payments (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- An order can be successfully paid only once (prevents double fulfilment)
CREATE UNIQUE INDEX payments_one_success_per_order
  ON payments (order_id)
  WHERE status = 'succeeded';

CREATE INDEX payments_order_idx ON payments (order_id);

-- Powers the reconciliation job: "find unresolved payments, oldest first"
CREATE INDEX payments_unresolved_idx
  ON payments (created_at)
  WHERE status IN ('initiated', 'pending');

CREATE TRIGGER payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- webhook_events: raw inbox of everything providers send us
-- ------------------------------------------------------------
CREATE TABLE webhook_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider         payment_provider NOT NULL,

  -- The provider's event id. Stripe sends one (evt_...). Where a provider
  -- does not, derive a stable key such as sha256(event_type || reference).
  event_id         text NOT NULL,
  event_type       text NOT NULL,

  signature_valid  boolean NOT NULL,
  payload          jsonb NOT NULL,                  -- store the body exactly as received
  status           webhook_status NOT NULL DEFAULT 'received',
  attempts         integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error            text,

  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,

  -- Core idempotency guarantee: the same event can never be stored twice
  CONSTRAINT webhook_events_provider_event_uniq UNIQUE (provider, event_id)
);

CREATE INDEX webhook_events_status_idx
  ON webhook_events (received_at)
  WHERE status IN ('received', 'failed');

-- ------------------------------------------------------------
-- refunds
-- ------------------------------------------------------------
CREATE TABLE refunds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          uuid NOT NULL REFERENCES payments (id) ON DELETE RESTRICT,
  provider_refund_id  text,
  amount_minor        bigint NOT NULL CHECK (amount_minor > 0),
  currency            char(3) NOT NULL CHECK (currency = upper(currency)),
  status              refund_status NOT NULL DEFAULT 'pending',
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX refunds_provider_refund_uniq
  ON refunds (payment_id, provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

CREATE INDEX refunds_payment_idx ON refunds (payment_id);

CREATE TRIGGER refunds_set_updated_at
  BEFORE UPDATE ON refunds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- payment_status_history: audit trail of every state change
-- Answers "why is this order marked paid?" and proves the
-- reconciliation job caught a missed webhook.
-- ------------------------------------------------------------
CREATE TABLE payment_status_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id        uuid NOT NULL REFERENCES payments (id) ON DELETE CASCADE,
  from_status       payment_status,                  -- null for the first row
  to_status         payment_status NOT NULL,
  source            status_source NOT NULL,
  webhook_event_id  uuid REFERENCES webhook_events (id) ON DELETE SET NULL,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_status_history_payment_idx
  ON payment_status_history (payment_id, created_at);

COMMIT;
