import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = process.env.TURSO_DATABASE_URL;

    // In production we point at Turso (libsql://). Locally we fall back to the
    // standard SQLite file driver so `pnpm dev` and `prisma db push` keep
    // working exactly as before, with no Turso account required.
    if (url && url.startsWith("libsql://")) {
      const adapter = new PrismaLibSql({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
      super({ adapter });
    } else {
      super();
    }
  }

  async onModuleInit() {
    await this.$connect();
  }
}
