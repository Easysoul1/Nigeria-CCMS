import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  async stats() {
    const [users, cases, hearings, documents, audits] = await Promise.all([
      this.prisma.user.groupBy({ by: ["role"], _count: { _all: true }, where: { deletedAt: null } }),
      this.prisma.case.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.hearing.count(),
      this.prisma.document.count(),
      this.prisma.auditLog.count(),
    ]);
    return { users, cases, hearings, documents, audits };
  }
}
