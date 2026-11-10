import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { PartyRole } from "@prisma/client";

@Injectable()
export class PartiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(caseId: string) {
    return this.prisma.party.findMany({ where: { caseId } });
  }

  async create(caseId: string, body: { name: string; role: PartyRole; contactInfo?: unknown; counselName?: string; isIndividual?: boolean }) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    return this.prisma.party.create({
      data: {
        caseId,
        name: body.name,
        role: body.role,
        contactInfo: body.contactInfo === undefined ? undefined : (body.contactInfo as Prisma.InputJsonValue),
        counselName: body.counselName ?? null,
        isIndividual: body.isIndividual ?? true,
      },
    });
  }

  async update(caseId: string, partyId: string, body: { name?: string; role?: PartyRole; contactInfo?: unknown; counselName?: string; isIndividual?: boolean }) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party || party.caseId !== caseId) throw new NotFoundException();
    return this.prisma.party.update({
      where: { id: partyId },
      data: {
        name: body.name ?? party.name,
        role: body.role ?? party.role,
        contactInfo: body.contactInfo !== undefined ? (body.contactInfo as Prisma.InputJsonValue) : party.contactInfo ?? undefined,
        counselName: body.counselName !== undefined ? body.counselName : party.counselName,
        isIndividual: body.isIndividual !== undefined ? body.isIndividual : party.isIndividual,
      },
    });
  }

  async remove(caseId: string, partyId: string) {
    const party = await this.prisma.party.findUnique({ where: { id: partyId } });
    if (!party || party.caseId !== caseId) throw new NotFoundException();
    await this.prisma.party.delete({ where: { id: partyId } });
  }
}
