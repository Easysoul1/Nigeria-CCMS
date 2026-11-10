import { Controller, Get } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";
import { AdminService } from "./admin.service";

@Roles(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly svc: AdminService) {}
  @Get("stats")
  stats() { return this.svc.stats(); }
}
