import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
};

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly client: PrismaClient;

  public constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(this.pool);
    this.client = new PrismaClient({ adapter });
  }

  public get user(): PrismaClient['user'] {
    return this.client.user;
  }

  public get video(): PrismaClient['video'] {
    return this.client.video;
  }

  public get category(): PrismaClient['category'] {
    return this.client.category;
  }

  public get videoCategory(): PrismaClient['videoCategory'] {
    return this.client.videoCategory;
  }

  public get thumbSeek(): PrismaClient['thumbSeek'] {
    return this.client.thumbSeek;
  }

  public get playerSettings(): PrismaClient['playerSettings'] {
    return this.client.playerSettings;
  }

  public get playerSettingsIncludedCategory(): PrismaClient['playerSettingsIncludedCategory'] {
    return this.client.playerSettingsIncludedCategory;
  }

  public get playerSettingsExcludedCategory(): PrismaClient['playerSettingsExcludedCategory'] {
    return this.client.playerSettingsExcludedCategory;
  }

  public $transaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>,
    options?: TransactionOptions,
  ): Promise<R>;
  public $transaction<R>(queries: Array<Prisma.PrismaPromise<R>>, options?: TransactionOptions): Promise<R[]>;
  public $transaction<R>(
    arg: ((tx: Prisma.TransactionClient) => Promise<R>) | Array<Prisma.PrismaPromise<R>>,
    options?: TransactionOptions,
  ): Promise<R | R[]> {
    if (typeof arg === 'function') {
      return this.client.$transaction(arg, options);
    }
    return this.client.$transaction(arg, options);
  }

  public async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Connected to PostgreSQL via Prisma');
  }

  public async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    await this.pool.end();
  }
}
