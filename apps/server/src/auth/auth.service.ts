import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import bcrypt from "bcryptjs";
import { NullEmailProvider } from "./services/email-provider";
import { PrismaService } from "../prisma/prisma.service";
import { TokenService } from "./services/token.service";
import { sha256, randomToken } from "./services/hash.util";
import { AuthUser } from "../common/decorators/current-user.decorator";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MIN = 15;

@Injectable()
export class AuthService {
  private readonly email = new NullEmailProvider();
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // generic — no user enumeration
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const next = user.failedLoginCount + 1;
      const data: Record<string, unknown> = { failedLoginCount: next };
      if (next >= MAX_FAILURES) {
        data.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      }
      await this.prisma.user.update({ where: { id: user.id }, data });
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const issued = await this.tokens.issueFor({ id: user.id, email: user.email, role: user.role });
    return issued;
  }

  async createLawyerRequest(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    nbaEnrolmentNumber: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Unable to create request");
    }
    const hash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role: "LAWYER",
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        isActive: false,
      },
    });
    await this.prisma.lawyerProfile.create({
      data: {
        userId: user.id,
        nbaEnrolmentNumber: input.nbaEnrolmentNumber,
        verificationStatus: "PENDING",
      },
    });
    return { id: user.id, email: user.email, status: "PENDING_VERIFICATION" };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Generic success — no enumeration
    if (!user) return;
    if (!user.isActive || user.deletedAt) return;
    const token = randomToken(32);
    const hash = sha256(token);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: hash,
        passwordResetExpiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000),
        passwordResetUsedAt: null,
      },
    });
    const base = this.config.get<string>("PASSWORD_RESET_URL", "http://localhost:3000/reset-password");
    const link = `${base}?token=${token}&email=${encodeURIComponent(user.email)}`;
    await this.email.sendPasswordReset(user.email, link);
  }

  async resetPassword(token: string, email: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException("Invalid or expired token");
    }
    if (user.passwordResetUsedAt) throw new BadRequestException("Invalid or expired token");
    if (user.passwordResetExpiresAt.getTime() < Date.now()) throw new BadRequestException("Invalid or expired token");
    if (sha256(token) !== user.passwordResetTokenHash) throw new BadRequestException("Invalid or expired token");
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        passwordResetUsedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    await this.tokens.revokeAll(user.id);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        lawyerProfile: {
          select: {
            nbaEnrolmentNumber: true,
            verificationStatus: true,
            verifiedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async changePassword(user: AuthUser, current: string, next: string) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!full) throw new NotFoundException();
    const ok = await bcrypt.compare(current, full.passwordHash);
    if (!ok) throw new UnauthorizedException("Current password incorrect");
    const hash = await bcrypt.hash(next, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    await this.tokens.revokeAll(user.id);
  }
}
