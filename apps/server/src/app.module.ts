import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";
import { BullModule } from "@nestjs/bullmq";
import { PassportModule } from "@nestjs/passport";
import { ThrottlerModule } from "@nestjs/throttler";
import { CsrfGuard } from "./common/guards/csrf.guard";
import { JwtModule } from "@nestjs/jwt";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CasesModule } from "./cases/cases.module";
import { DocumentsModule } from "./documents/documents.module";
import { HearingsModule } from "./hearings/hearings.module";
import { RulingsModule } from "./rulings/rulings.module";
import { AuditModule } from "./audit/audit.module";
import { AdminModule } from "./admin/admin.module";
import { MetaModule } from "./meta/meta.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PublicModule } from "./public/public.module";
import { PartiesModule } from "./parties/parties.module";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { validateEnv } from "./config/env.schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: (raw) => validateEnv(raw),
    }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60000, limit: 30 }]),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get("NODE_ENV") === "development";
        return {
          pinoHttp: {
            level: config.get<string>("LOG_LEVEL", "info"),
            autoLogging: true,
            genReqId: (req: unknown) => {
              const r = req as { headers?: Record<string, string | string[] | undefined> };
              const h = r?.headers?.["x-request-id"];
              const val = Array.isArray(h) ? h[0] : h;
              return val && typeof val === "string" ? val : crypto.randomUUID();
            },
            transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
          },
        };
      },
    }),
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
    PrismaModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ connection: { host: c.get<string>("REDIS_HOST","localhost"), port: c.get<number>("REDIS_PORT",6379) } }),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    CasesModule,
    PartiesModule,
    DocumentsModule,
    HearingsModule,
    RulingsModule,
    AuditModule,
    NotificationsModule,
    PublicModule,
    AdminModule,
    MetaModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [ConfigModule],
})
export class AppModule {}
