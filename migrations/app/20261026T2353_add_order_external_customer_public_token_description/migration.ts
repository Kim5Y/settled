#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/193957919201aba09101dcf1d20cfc3f957d1d17ee97b2ae7ea6605f2eced6ec/contract';
import startContract from '../../snapshots/193957919201aba09101dcf1d20cfc3f957d1d17ee97b2ae7ea6605f2eced6ec/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ac97c03222a0a5651d6860fd7419a8ed03443bc92f83366cce2f18769db10993/contract';
import endContract from '../../snapshots/ac97c03222a0a5651d6860fd7419a8ed03443bc92f83366cce2f18769db10993/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'orders',
        column: col('external_customer_id', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addRequiredColumnToEmptyTable({
        schema: 'public',
        table: 'orders',
        column: 'public_token',
        type: 'text',
      }),
      this.addUnique({
        schema: 'public',
        table: 'orders',
        constraint: 'orders_public_token_key',
        columns: ['public_token'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'orders',
        index: 'orders_external_customer_idx',
        columns: ['external_customer_id'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
