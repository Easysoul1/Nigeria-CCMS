import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { sha256, randomToken } from "./hash.util";

const REFRESH_TTL_MS = 7 * 24 * 3600 * 1000;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async issueFor(user: { id: string; email: string; role: string }) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    const familyId = randomUUID();
    const raw = randomToken();
    const hash = sha256(raw);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hash, familyId, expiresAt },
    });
    return { accessToken, refreshToken: raw, accessExpiresIn: "15m" as const, refreshExpiresAt: expiresAt };
  }

  async rotate(raw: string, meta: { userAgent?: string; ipAddress?: string }) {
    const hash = sha256(raw);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!existing) {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (existing.revokedAt) {
      // reuse detected — burn the whole family
      await this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected; family revoked");
    }
    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      select: { id: true, email: true, role: true, isActive: true, deletedAt: true },
    });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException("Account inactive");
    }

    const rawNew = randomToken();
    const hashNew = sha256(rawNew);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    const created = await this.prisma.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashNew,
        familyId: existing.familyId,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedById: created.id },
    });

    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, refreshToken: rawNew, refreshExpiresAt: expiresAt };
  }

  async revoke(raw: string | null | undefined) {
    if (!raw) return;
    const hash = sha256(raw);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
