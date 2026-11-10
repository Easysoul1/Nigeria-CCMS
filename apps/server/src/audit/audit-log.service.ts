import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}
  async list(input: { page: number; pageSize: number; userId?: string; entity?: string; action?: string }) {
    const where: Record<string, unknown> = {};
    if (input.userId) where.userId = input.userId;
    if (input.entity) where.entity = input.entity;
    if (input.action) where.action = { contains: input.action, mode: "insensitive" };
    const skip = (input.page - 1) * input.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take: input.pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: input.page, pageSize: input.pageSize };
  }
}
