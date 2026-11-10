import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CasesService } from "../cases/cases.service";
import { PartiesService } from "./parties.service";
import { PartyRole } from "@prisma/client";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@prisma/client";

@Controller("cases/:caseId/parties")
export class PartiesController {
  constructor(private readonly parties: PartiesService, private readonly cases: CasesService) {}

  @Get()
  async list(@Param("caseId") caseId: string) {
    await this.cases.get(caseId, { id: "", role: "ADMIN" }); // enforce existence/coarse; role scoping done elsewhere
    return this.parties.list(caseId);
  }

  @Roles(Role.LAWYER, Role.REGISTRAR, Role.ADMIN)
  @Post()
  async create(@Param("caseId") caseId: string, @Body() body: { name: string; role: PartyRole; contactInfo?: unknown; counselName?: string; isIndividual?: boolean }) {
    return this.parties.create(caseId, body);
  }

  @Roles(Role.LAWYER, Role.REGISTRAR, Role.ADMIN)
  @Patch(":partyId")
  async update(@Param("caseId") caseId: string, @Param("partyId") partyId: string, @Body() body: { name?: string; role?: PartyRole; contactInfo?: unknown; counselName?: string; isIndividual?: boolean }) {
    return this.parties.update(caseId, partyId, body);
  }

  @Roles(Role.LAWYER, Role.REGISTRAR, Role.ADMIN)
  @Delete(":partyId")
  async remove(@Param("caseId") caseId: string, @Param("partyId") partyId: string) {
    await this.parties.remove(caseId, partyId);
    return { ok: true };
  }
}
