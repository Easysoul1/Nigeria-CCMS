import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import * as net from "node:net";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    checks.database = await this.databaseCheck();

    const redisHost = this.config.get<string>("REDIS_HOST") ?? "localhost";
    const redisPort = this.config.get<number>("REDIS_PORT") ?? 6379;
    checks.redis = await this.tcpCheck(redisHost, redisPort);

    checks.minio = await this.minioCheck();

    const ok = Object.values(checks).every((check) => check.ok);
    if (ok) return { status: "ok", checks };

    // Locally we run SQLite without Redis/MinIO. Report the detail but do not
    // fail the readiness probe, so developers can still see the app is up.
    if (process.env.NODE_ENV !== "production") {
      return { status: "degraded", checks };
    }
    throw new HttpException({ status: "error", checks }, HttpStatus.SERVICE_UNAVAILABLE);
  }

  private databaseUrl(): string {
    return process.env.DATABASE_URL ?? "";
  }

  private async databaseCheck(): Promise<{ ok: boolean; detail?: string }> {
    // SQLite (local development) cannot be probed over TCP.
    if (this.databaseUrl().startsWith("file:")) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        return { ok: true, detail: "sqlite" };
      } catch (e) {
        return { ok: false, detail: (e as Error).message };
      }
    }
    return this.tcpCheck(this.parseDbHost(), this.parseDbPort());
  }

  private parseDbHost(): string {
    try {
      return new URL(this.databaseUrl()).hostname || "localhost";
    } catch {
      return "localhost";
    }
  }

  private parseDbPort(): number {
    try {
      return Number(new URL(this.databaseUrl()).port) || 5432;
    } catch {
      return 5432;
    }
  }

  private tcpCheck(host: string, port: number): Promise<{ ok: boolean; detail?: string }> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ ok: false, detail: "timeout" });
      }, 3000);
      socket.once("connect", () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ ok: true });
      });
      socket.once("error", (e: Error) => {
        clearTimeout(timer);
        resolve({ ok: false, detail: e.message });
      });
      socket.connect(port, host);
    });
  }

  private async minioCheck(): Promise<{ ok: boolean; detail?: string }> {
    try {
      const client = new S3Client({
        endpoint: `${this.config.get("MINIO_USE_SSL") ? "https" : "http"}://${this.config.get(
          "MINIO_ENDPOINT",
        )}:${this.config.get("MINIO_PORT")}`,
        region: "us-east-1",
        credentials: {
          accessKeyId: this.config.get<string>("MINIO_USER") ?? "",
          secretAccessKey: this.config.get<string>("MINIO_PASSWORD") ?? "",
        },
        forcePathStyle: true,
      });
      await client.send(new HeadBucketCommand({ Bucket: this.config.get<string>("MINIO_BUCKET") ?? "" }));
      return { ok: true };
    } catch (e) {
      return { ok: false, detail: (e as Error).message };
    }
  }
}
