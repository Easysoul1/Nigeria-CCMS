import type { Request } from "express";
import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
// no public marker needed here
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UsersService } from "./users.service";

@Roles(Role.ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  async create(
    @Body() body: { email: string; password: string; role: string; firstName: string; lastName: string; phoneNumber?: string },
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    const hashed = await bcrypt.hash(body.password, 12);
    return this.users.createByAdmin(
      {
        email: body.email,
        passwordHash: hashed,
        role: body.role as Role,
        firstName: body.firstName,
        lastName: body.lastName,
        phoneNumber: body.phoneNumber,
      },
      actor.id,
      { ipAddress: req.ip, userAgent: req.headers["user-agent"] as string },
    );
  }

  @Get()
  async list(
    @Query("page") page = "1",
    @Query("pageSize") pageSize = "20",
    @Query("role") role?: string,
    @Query("isActive") isActive?: string,
    @Query("q") q?: string,
  ) {
    return this.users.list({
      page: Number(page),
      pageSize: Math.min(Number(pageSize), 100),
      role: role ? (role as Role) : undefined,
      isActive: isActive === undefined ? undefined : isActive === "true",
      q,
    });
  }

  @Get("judges")
  @Roles(Role.ADMIN, Role.REGISTRAR)
  async judges() {
    return this.users.findJudges();
  }

  @Patch(":id/role")
  async updateRole(
    @Param("id") id: string,
    @Body() body: { role: Role },
    @CurrentUser() actor: { id: string },
    @Req() req: Request,
  ) {
    return this.users.updateRole(id, body.role, actor.id, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
    });
  }

  @Patch(":id/deactivate")
  async deactivate(@Param("id") id: string, @CurrentUser() actor: { id: string }) {
    return this.users.deactivate(id, actor.id, {});
  }

  @Patch(":id/reactivate")
  async reactivate(@Param("id") id: string, @CurrentUser() actor: { id: string }) {
    return this.users.reactivate(id, actor.id, {});
  }

  @Patch(":id/delete")
  async softDelete(@Param("id") id: string, @CurrentUser() actor: { id: string }) {
    return this.users.softDelete(id, actor.id, {});
  }
}
