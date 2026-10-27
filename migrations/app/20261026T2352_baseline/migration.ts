#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/193957919201aba09101dcf1d20cfc3f957d1d17ee97b2ae7ea6605f2eced6ec/contract';
import endContract from '../../snapshots/193957919201aba09101dcf1d20cfc3f957d1d17ee97b2ae7ea6605f2eced6ec/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'order_status',
        members: ['pending', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'payment_provider',
        members: ['stripe', 'paystack', 'flutterwave'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'payment_status',
        members: [
          'initiated',
          'pending',
          'succeeded',
          'failed',
          'abandoned',
          'refunded',
          'partially_refunded',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'refund_status',
        members: ['pending', 'succeeded', 'failed'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'status_source',
        members: ['api', 'webhook', 'reconciliation', 'manual'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'webhook_status',
        members: ['received', 'processed', 'ignored', 'failed'],
      }),
      this.createTable({
        schema: 'public',
        table: 'orders',
        columns: [
          col('amount_minor', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'character(3)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 3 } },
          }),
          col('customer_email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customer_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('metadata', 'jsonb', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('paid_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('reference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"order_status"', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'order_status' } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'orders_pkey' }),
          checkExpression('orders_amount_minor_check', sql`(amount_minor > 0)`),
          checkExpression(
            'orders_currency_check',
            sql`((currency)::text = upper((currency)::text))`,
          ),
          checkExpression(
            'orders_paid_at_matches_status',
            sql`((status = ANY (ARRAY['paid'::order_status, 'partially_refunded'::order_status, 'refunded'::order_status])) = (paid_at IS NOT NULL))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'payment_status_history',
        columns: [
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('from_status', '"payment_status"', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'payment_status' } },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payment_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('source', '"status_source"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'status_source' } },
          }),
          col('to_status', '"payment_status"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'payment_status' } },
          }),
          col('webhook_event_id', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'], { name: 'payment_status_history_pkey' })],
      }),
      this.createTable({
        schema: 'public',
        table: 'payments',
        columns: [
          col('amount_minor', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('amount_received_minor', 'int8', { codecRef: { codecId: 'pg/int8@1' } }),
          col('channel', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('checkout_url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'character(3)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 3 } },
          }),
          col('expires_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('failure_reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('idempotency_key', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('last_reconciled_at', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('metadata', 'jsonb', {
            notNull: true,
            default: lit({}),
            codecRef: { codecId: 'pg/jsonb@1' },
          }),
          col('order_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('paid_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', '"payment_provider"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'payment_provider' } },
          }),
          col('provider_reference', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('provider_transaction_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reconcile_attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', '"payment_status"', {
            notNull: true,
            default: lit('initiated'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'payment_status' } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'payments_pkey' }),
          checkExpression('payments_amount_minor_check', sql`(amount_minor > 0)`),
          checkExpression(
            'payments_amount_received_minor_check',
            sql`(amount_received_minor >= 0)`,
          ),
          checkExpression(
            'payments_currency_check',
            sql`((currency)::text = upper((currency)::text))`,
          ),
          checkExpression(
            'payments_paid_at_matches_status',
            sql`((status = ANY (ARRAY['succeeded'::payment_status, 'refunded'::payment_status, 'partially_refunded'::payment_status])) = (paid_at IS NOT NULL))`,
          ),
          checkExpression('payments_reconcile_attempts_check', sql`(reconcile_attempts >= 0)`),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'refunds',
        columns: [
          col('amount_minor', 'int8', { notNull: true, codecRef: { codecId: 'pg/int8@1' } }),
          col('created_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currency', 'character(3)', {
            notNull: true,
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 3 } },
          }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('payment_id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('provider_refund_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"refund_status"', {
            notNull: true,
            default: lit('pending'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'refund_status' } },
          }),
          col('updated_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'refunds_pkey' }),
          checkExpression('refunds_amount_minor_check', sql`(amount_minor > 0)`),
          checkExpression(
            'refunds_currency_check',
            sql`((currency)::text = upper((currency)::text))`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'webhook_events',
        columns: [
          col('attempts', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('event_id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('event_type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', {
            notNull: true,
            default: fn(sql`gen_random_uuid()`),
            codecRef: { codecId: 'pg/uuid@1' },
          }),
          col('payload', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('processed_at', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('provider', '"payment_provider"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'payment_provider' } },
          }),
          col('received_at', 'timestamptz', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('signature_valid', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('status', '"webhook_status"', {
            notNull: true,
            default: lit('received'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'webhook_status' } },
          }),
        ],
        constraints: [
          primaryKey(['id'], { name: 'webhook_events_pkey' }),
          checkExpression('webhook_events_attempts_check', sql`(attempts >= 0)`),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'orders',
        constraint: 'orders_reference_key',
        columns: ['reference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payments',
        constraint: 'payments_provider_reference_uniq',
        columns: ['provider', 'provider_reference'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'webhook_events',
        constraint: 'webhook_events_provider_event_uniq',
        columns: ['provider', 'event_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_customer_email_idx',
        columns: ['customer_email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_status_created_idx',
        columns: ['status', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_status_history',
        index: 'payment_status_history_payment_idx',
        columns: ['payment_id', 'created_at'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_idempotency_key_uniq',
        columns: ['idempotency_key'],
        extras: { where: sql`(idempotency_key IS NOT NULL)`, unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_one_success_per_order',
        columns: ['order_id'],
        extras: { where: sql`(status = 'succeeded'::payment_status)`, unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_order_idx',
        columns: ['order_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_provider_txn_uniq',
        columns: ['provider', 'provider_transaction_id'],
        extras: { where: sql`(provider_transaction_id IS NOT NULL)`, unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'payments',
        index: 'payments_unresolved_idx',
        columns: ['created_at'],
        extras: {
          where: sql`(status = ANY (ARRAY['initiated'::payment_status, 'pending'::payment_status]))`,
        },
      }),
      this.createIndex({
        schema: 'public',
        table: 'refunds',
        index: 'refunds_payment_idx',
        columns: ['payment_id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refunds',
        index: 'refunds_provider_refund_uniq',
        columns: ['payment_id', 'provider_refund_id'],
        extras: { where: sql`(provider_refund_id IS NOT NULL)`, unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'webhook_events',
        index: 'webhook_events_status_idx',
        columns: ['received_at'],
        extras: {
          where: sql`(status = ANY (ARRAY['received'::webhook_status, 'failed'::webhook_status]))`,
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment_status_history',
        foreignKey: {
          name: 'payment_status_history_payment_id_fkey',
          columns: ['payment_id'],
          references: { schema: 'public', table: 'payments', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payment_status_history',
        foreignKey: {
          name: 'payment_status_history_webhook_event_id_fkey',
          columns: ['webhook_event_id'],
          references: { schema: 'public', table: 'webhook_events', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'payments',
        foreignKey: {
          name: 'payments_order_id_fkey',
          columns: ['order_id'],
          references: { schema: 'public', table: 'orders', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refunds',
        foreignKey: {
          name: 'refunds_payment_id_fkey',
          columns: ['payment_id'],
          references: { schema: 'public', table: 'payments', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
