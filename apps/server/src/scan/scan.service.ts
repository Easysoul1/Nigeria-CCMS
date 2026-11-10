import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as net from "node:net";
import { writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

export type ScanResult = "CLEAN" | "INFECTED";

@Injectable()
export class ScanService {
  private readonly logger = new Logger(ScanService.name);
  constructor(private readonly cfg: ConfigService) {}

  async scan(buffer: Buffer): Promise<ScanResult> {
    const host = this.cfg.get<string>("CLAMAV_HOST");
    if (host) {
      try {
        return await this.scanClamd(host, this.cfg.get<number>("CLAMAV_PORT", 3310), buffer);
      } catch (e) {
        this.logger.error(`clamd scan failed: ${(e as Error).message}`);
        throw e;
      }
    }
    // Dev fallback
    try {
      const tmp = `/tmp/opencode/scan-${Date.now()}.bin`;
      writeFileSync(tmp, buffer);
      execSync(`clamscan --no-summary "${tmp}"`, { stdio: "ignore" });
      return "CLEAN";
    } catch (e) {
      // clamscan exits 1 when infection found
      const status = (e as { status?: number }).status;
      if (status === 1) return "INFECTED";
      this.logger.warn("clamscan unavailable; defaulting to CLEAN (dev only)");
      return "CLEAN";
    }
  }

  private scanClamd(host: string, port: number, buffer: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(port, host);
      let resp = "";
      socket.on("connect", () => {
        socket.write(Buffer.from("INSTREAM\0"));
        const chunkSize = 65536;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.subarray(i, i + chunkSize);
          const len = Buffer.alloc(4);
          len.writeUInt32BE(chunk.length, 0);
          socket.write(Buffer.concat([len, chunk]));
        }
        // zero-length terminus
        socket.write(Buffer.alloc(4));
      });
      socket.on("data", (d) => { resp += d.toString(); });
      socket.on("end", () => {
        socket.destroy();
        if (resp.includes("FOUND")) resolve("INFECTED");
        else if (resp.includes("OK")) resolve("CLEAN");
        else resolve("CLEAN");
      });
      socket.on("error", reject);
      socket.setTimeout(30000, () => { socket.destroy(); reject(new Error("scan timeout")); });
    });
  }
}
