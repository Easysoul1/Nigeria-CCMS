import { Controller, Get, Query } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { AuditLogService } from "./audit-log.service";

@Roles(Role.ADMIN)
@Controller("audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditLogService) {}
  @Get()
  async list(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("userId") userId?: string,
    @Query("entity") entity?: string,
    @Query("action") action?: string,
  ) {
    return this.audit.list({ page: Number(page), pageSize: Math.min(Number(pageSize), 100), userId, entity, action });
  }
}
