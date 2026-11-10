import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { RulingsService } from "./rulings.service";

@Roles(Role.JUDGE, Role.ADMIN, Role.REGISTRAR)
@Controller("cases/:caseId/rulings")
export class RulingsController {
  constructor(private readonly rulings: RulingsService) {}

  @Get()
  async list(@Param("caseId") caseId: string) {
    return this.rulings.list(caseId);
  }

  @Roles(Role.JUDGE)
  @Post()
  async create(
    @Param("caseId") caseId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { title: string; body: string; hearingId?: string; citations?: unknown },
  ) {
    return this.rulings.create({
      caseId,
      judgeId: user.id,
      title: body.title,
      body: body.body,
      hearingId: body.hearingId,
      citations: body.citations,
    });
  }

  @Roles(Role.JUDGE)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @CurrentUser() user: { id: string },
    @Body() body: { title?: string; body?: string; citations?: unknown },
  ) {
    return this.rulings.update(id, user.id, body);
  }

  @Roles(Role.JUDGE)
  @Post(":id/publish")
  async publish(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.rulings.publish(id, user.id);
  }
}
