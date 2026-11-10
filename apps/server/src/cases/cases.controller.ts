import { Body, Controller, Param, Patch, Post, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { CasesService } from "./cases.service";
import { CreateCaseDto } from "./dto/create-case.dto";
import { UpdateCaseDto } from "./dto/update-case.dto";
import { ApproveCaseDto, RejectCaseDto, AssignJudgeDto, UpdateStatusDto } from "./dto/transition.dto";

@Roles(Role.LAWYER, Role.JUDGE, Role.REGISTRAR, Role.ADMIN)
@Controller("cases")
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Roles(Role.LAWYER)
  @Post()
  async create(@CurrentUser() user: { id: string; role: string }, @Body() dto: CreateCaseDto) {
    return this.cases.create(user.id, dto);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @CurrentUser() user: { id: string; role: string }, @Body() dto: UpdateCaseDto) {
    return this.cases.update(id, user.id, user.role, dto);
  }

  @Post(":id/submit")
  async submit(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.cases.submit(id, user.id);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Patch(":id/approve")
  async approve(@Param("id") id: string, @CurrentUser() user: { id: string }, @Body() dto: ApproveCaseDto) {
    return this.cases.approve(id, user.id, dto);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Patch(":id/reject")
  async reject(@Param("id") id: string, @CurrentUser() user: { id: string }, @Body() dto: RejectCaseDto) {
    return this.cases.reject(id, user.id, dto);
  }

  @Roles(Role.REGISTRAR, Role.ADMIN)
  @Patch(":id/assign-judge")
  async assignJudge(@Param("id") id: string, @CurrentUser() user: { id: string }, @Body() dto: AssignJudgeDto) {
    return this.cases.assignJudge(id, user.id, dto);
  }

  @Roles(Role.JUDGE, Role.REGISTRAR, Role.ADMIN)
  @Patch(":id/status")
  async updateStatus(@Param("id") id: string, @CurrentUser() user: { id: string; role: string }, @Body() dto: UpdateStatusDto) {
    return this.cases.updateStatus(id, user.id, user.role, dto.status);
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.cases.get(id, user);
  }

  @Get()
  async list(
    @CurrentUser() user: { id: string; role: string },
    @Query("status") status?: string,
    @Query("divisionId") divisionId?: string,
    @Query("q") q?: string,
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
  ) {
    const filters = {
      status: status as import("@prisma/client").CaseStatus | undefined,
      divisionId,
      q,
      page: Number(page),
      pageSize: Math.min(Number(pageSize), 100),
    };
    return this.cases.list(user, filters);
  }

  @Get(":id/timeline")
  async timeline(@Param("id") id: string, @CurrentUser() user: { id: string; role: string }) {
    return this.cases.timeline(id, user);
  }
}

