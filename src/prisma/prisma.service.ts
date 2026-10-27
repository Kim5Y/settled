import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db } from './db';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = db;

  async onModuleDestroy(): Promise<void> {
    await db.close();
  }
}
