import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, Role } from "@prisma/client";

/**
 * Never select `passwordHash` (or any credential material) for API responses.
 * Every read and write below goes through this projection.
 */
const PUBLIC_USER = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect;

type AuditMeta = { ipAddress?: string; userAgent?: string; requestId?: string };

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createByAdmin(
    input: {
      email: string;
      passwordHash: string;
      role: Role;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    },
    actorId: string,
    meta: AuditMeta,
  ) {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ForbiddenException("A user with that email already exists");

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber ?? null,
        isActive: true,
      },
      select: PUBLIC_USER,
    });
    await this.audit(actorId, "USER_CREATED", user.id, null, { role: user.role, email: user.email }, meta);
    return user;
  }

  async list(input: { page: number; pageSize: number; role?: Role; isActive?: boolean; q?: string }) {
    const skip = (input.page - 1) * input.pageSize;
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (input.role) where.role = input.role;
    if (input.isActive !== undefined) where.isActive = input.isActive;
    if (input.q) {
      const term = input.q.trim();
      if (term.length > 0) {
        // SQLite `contains` is already case-insensitive; `mode` is Postgres-only.
        where.OR = [
          { email: { contains: term } },
          { firstName: { contains: term } },
          { lastName: { contains: term } },
        ];
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: input.pageSize,
        orderBy: { createdAt: "desc" },
        select: PUBLIC_USER,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: input.page, pageSize: input.pageSize };
  }

  async updateRole(id: string, role: Role, actorId: string, meta: AuditMeta) {
    const target = await this.prisma.user.findUnique({ where: { id }, select: { role: true, deletedAt: true } });
    if (!target || target.deletedAt) throw new NotFoundException();
    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      const admins = await this.prisma.user.count({
        where: { role: Role.ADMIN, deletedAt: null, isActive: true },
      });
      if (admins <= 1) throw new ForbiddenException("Cannot remove the last active Admin");
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { role }, select: PUBLIC_USER });
    await this.audit(actorId, "USER_ROLE_CHANGED", id, { role: target.role }, { role }, meta);
    return updated;
  }

  async deactivate(id: string, actorId: string, meta: AuditMeta) {
    await this.assertNotLastActiveAdmin(id, "deactivate");
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: PUBLIC_USER,
    });
    await this.audit(actorId, "USER_DEACTIVATED", id, null, { isActive: false }, meta);
    return updated;
  }

  async reactivate(id: string, actorId: string, meta: AuditMeta) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: PUBLIC_USER,
    });
    await this.audit(actorId, "USER_REACTIVATED", id, null, { isActive: true }, meta);
    return updated;
  }

  async softDelete(id: string, actorId: string, meta: AuditMeta) {
    await this.assertNotLastActiveAdmin(id, "delete");
    const updated = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: PUBLIC_USER,
    });
    await this.audit(actorId, "USER_SOFT_DELETED", id, null, { deletedAt: updated.deletedAt }, meta);
    return updated;
  }

  async findJudges() {
    const judges = await this.prisma.user.findMany({
      where: { role: Role.JUDGE, deletedAt: null, isActive: true },
      select: {
        ...PUBLIC_USER,
        casesJudged: {
          where: { status: { in: ["ACTIVE", "ADJOURNED"] } },
          select: { id: true },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return judges.map(({ casesJudged, ...judge }) => ({
      ...judge,
      activeCaseload: casesJudged.length,
    }));
  }

  /**
   * A court system must always have at least one active Administrator.
   * This guard prevents both self-lockout and orphaned deployments where
   * every admin account is deactivated or soft-deleted.
   */
  private async assertNotLastActiveAdmin(id: string, verb: "deactivate" | "delete") {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true, isActive: true, deletedAt: true },
    });
    if (!target || target.deletedAt) throw new NotFoundException();
    if (target.role !== Role.ADMIN || !target.isActive) return;

    const otherActiveAdmins = await this.prisma.user.count({
      where: { role: Role.ADMIN, deletedAt: null, isActive: true, id: { not: id } },
    });
    if (otherActiveAdmins === 0) {
      throw new ForbiddenException(`Cannot ${verb} the last active Administrator`);
    }
  }

  private async audit(
    actorId: string,
    action: string,
    entityId: string,
    oldValues: Prisma.InputJsonValue | null,
    newValues: Prisma.InputJsonValue | null,
    meta: AuditMeta,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        entity: "User",
        entityId,
        oldValues: oldValues === null ? Prisma.JsonNull : oldValues,
        newValues: newValues === null ? Prisma.JsonNull : newValues,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
        requestId: meta.requestId ?? null,
      },
    });
  }
}
