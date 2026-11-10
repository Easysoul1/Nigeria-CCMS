import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Read-only reference data needed by staff forms (new-case wizard, approval
 * drawer, hearing scheduler). Authenticated for every role — the JwtAuthGuard
 * is global, so we intentionally do not narrow it with @Roles.
 */
@Controller("meta")
export class MetaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("divisions")
  async divisions() {
    const divisions = await this.prisma.division.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        courts: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, number: true },
        },
      },
    });
    return { divisions };
  }
}
