import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try { await this.$connect(); } catch (e) { console.warn("[Prisma] DB unavailable; routes needing DB will fail: ", (e as Error).message); }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
