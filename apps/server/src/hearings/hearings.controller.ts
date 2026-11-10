import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { HearingsService } from "./hearings.service";

@Controller("hearings")
export class HearingsController {
  constructor(private readonly h: HearingsService) {}

  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Post()
  async schedule(@Body() body: { caseId: string; courtId: string; scheduledAt: string; purpose?: string }, @CurrentUser() user: { id: string }) {
    return this.h.schedule(user.id, body);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN, Role.JUDGE)
  @Patch(":id/reschedule")
  async reschedule(@Param("id") id: string, @CurrentUser() user: { id: string }, @Body() body: { scheduledAt: string; reason: string }) {
    return this.h.reschedule(id, user.id, body);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN, Role.JUDGE)
  @Patch(":id/adjourn")
  async adjourn(@Param("id") id: string, @CurrentUser() user: { id: string }, @Body() body: { reason: string }) {
    return this.h.adjourn(id, user.id, body.reason);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Patch(":id/cancel")
  async cancel(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.h.cancel(id, user.id);
  }

  @Get("today")
  async today(@CurrentUser() user: { id: string; role: string }) {
    return this.h.listForDay(user);
  }

  @Get("week")
  async week(@CurrentUser() user: { id: string; role: string }) {
    return this.h.listForWeek(user);
  }
}
