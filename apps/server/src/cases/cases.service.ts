import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, CaseStatus, CaseEventType, Role } from "@prisma/client";
import { ApproveCaseDto, RejectCaseDto, AssignJudgeDto } from "./dto/transition.dto";
import { PrismaService } from "../prisma/prisma.service";
import { CaseStateMachineService } from "./case-state-machine.service";
import { CreateCaseDto } from "./dto/create-case.dto";
import { UpdateCaseDto } from "./dto/update-case.dto";

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService, private readonly sm: CaseStateMachineService) {}

  async create(userId: string, dto: CreateCaseDto) {
    const row = await this.prisma.case.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? null,
        reliefSought: dto.reliefSought ?? null,
        caseType: dto.caseType,
        suitTypeCode: dto.suitTypeCode,
        divisionId: dto.divisionId,
        courtId: dto.courtId ?? null,
        filedById: userId,
        status: CaseStatus.DRAFT,
      },
    });
    await this.event(row.id, CaseEventType.FILED, userId, {});
    return row;
  }

  async update(caseId: string, actorId: string, actorRole: string, dto: UpdateCaseDto) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    if (cas.filedById !== actorId && actorRole !== "ADMIN") throw new ForbiddenException();
    if (cas.status !== CaseStatus.DRAFT) throw new ConflictException({ code: "NOT_DRAFT", message: "Only draft cases can be edited" });
    return this.prisma.case.update({ where: { id: caseId }, data: dto });
  }

  async submit(caseId: string, actorId: string) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId }, include: { parties: true, documents: true } });
    if (!cas) throw new NotFoundException();
    if (cas.filedById !== actorId) throw new ForbiddenException();
    if (cas.status !== CaseStatus.DRAFT) throw new ConflictException({ code: "INVALID_TRANSITION", message: "Only drafts can be submitted" });
    if (cas.parties.length === 0) throw new BadRequestException({ code: "INCOMPLETE", message: "At least one party is required" });
    if (cas.documents.length === 0) throw new BadRequestException({ code: "INCOMPLETE", message: "At least one document is required" });

    this.sm.assert(cas.status, CaseStatus.PENDING_APPROVAL, "LAWYER");
    const updated = await this.prisma.case.update({ where: { id: caseId }, data: { status: CaseStatus.PENDING_APPROVAL } });
    await this.event(caseId, CaseEventType.FILED, actorId, { from: "DRAFT" });
    return updated;
  }

  async event(caseId: string, type: CaseEventType, actorId: string | null, metadata: Record<string, unknown>) {
    await this.prisma.caseEvent.create({
      data: { caseId, type, actorId, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  async approve(caseId: string, actorId: string, dto: ApproveCaseDto) {
    const cas = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { division: true },
    });
    if (!cas) throw new NotFoundException();
    if (cas.status !== CaseStatus.PENDING_APPROVAL) {
      throw new ConflictException({ code: "ALREADY_DECIDED", message: "Case is not awaiting approval" });
    }

    const judge = await this.prisma.user.findUnique({ where: { id: dto.judgeId } });
    if (!judge || !judge.isActive || judge.role !== Role.JUDGE || judge.deletedAt !== null) {
      throw new BadRequestException({ code: "INVALID_JUDGE", message: "Judge is inactive or invalid" });
    }

    if (dto.preferredHearingAt) {
      const t = new Date(dto.preferredHearingAt);
      const conflict = await this.prisma.hearing.findUnique({ where: { courtId_scheduledAt: { courtId: dto.courtId, scheduledAt: t } } });
      if (conflict) throw new ConflictException({ code: "SLOT_CONFLICT", message: "Hearing slot already booked" });
    }

    const year = new Date().getUTCFullYear();
    const approved = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.caseSequence.upsert({
        where: { divisionId_typeCode_year: { divisionId: cas.divisionId, typeCode: cas.suitTypeCode, year } },
        update: { lastValue: { increment: 1 } },
        create: { divisionId: cas.divisionId, typeCode: cas.suitTypeCode, year, lastValue: 1 },
      });
      const caseNumber = `FHC/${cas.division.code}/${cas.suitTypeCode}/${seq.lastValue}/${year}`;
      const updated = await tx.case.update({
        where: { id: caseId },
        data: {
          caseNumber,
          status: CaseStatus.ACTIVE,
          assignedJudgeId: dto.judgeId,
          courtId: dto.courtId,
          assignedRegistrarId: actorId,
          approvedAt: new Date(),
        },
      });
      await tx.caseEvent.create({
        data: { caseId, type: CaseEventType.APPROVED, actorId, metadata: { judgeId: dto.judgeId, courtId: dto.courtId } as Prisma.InputJsonValue },
      });
      if (dto.preferredHearingAt) {
        await tx.hearing.create({
          data: {
            caseId,
            courtId: dto.courtId,
            scheduledAt: new Date(dto.preferredHearingAt),
            purpose: "First hearing",
            status: (await import("@prisma/client")).HearingStatus.SCHEDULED,
            scheduledById: actorId,
          },
        });
      }
      return updated;
    });
    // notification enqueue stub: row-level
    await this.prisma.notification.create({
      data: { recipientId: cas.filedById, caseId, channel: (await import("@prisma/client")).NotificationChannel.EMAIL, template: "CASE_APPROVED", message: `Case ${approved.caseNumber} approved`, status: (await import("@prisma/client")).NotificationStatus.PENDING },
    }).catch(() => undefined);
    return approved;
  }

  async reject(caseId: string, actorId: string, dto: RejectCaseDto) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    if (cas.status !== CaseStatus.PENDING_APPROVAL) throw new ConflictException({ code: "NOT_PENDING", message: "Only pending cases can be rejected" });
    this.sm.assert(cas.status, CaseStatus.REJECTED, "REGISTRAR");
    const updated = await this.prisma.case.update({ where: { id: caseId }, data: { status: CaseStatus.REJECTED, rejectionReason: dto.reason } });
    await this.event(caseId, CaseEventType.REJECTED, actorId, { reason: dto.reason });
    return updated;
  }

  async assignJudge(caseId: string, actorId: string, dto: AssignJudgeDto) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    const judge = await this.prisma.user.findUnique({ where: { id: dto.judgeId } });
    if (!judge || judge.role !== Role.JUDGE || !judge.isActive) {
      throw new BadRequestException({ code: "INVALID_JUDGE", message: "Invalid or inactive judge" });
    }
    const updated = await this.prisma.case.update({ where: { id: caseId }, data: { assignedJudgeId: dto.judgeId } });
    await this.event(caseId, CaseEventType.JUDGE_ASSIGNED, actorId, { judgeId: dto.judgeId });
    return updated;
  }

  async updateStatus(caseId: string, actorId: string, role: string, requested: CaseStatus) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    this.sm.assert(cas.status, requested, role);
    const updated = await this.prisma.case.update({ where: { id: caseId }, data: { status: requested } });
    await this.event(caseId, CaseEventType.ADJOURNED, actorId, { to: requested });
    return updated;
  }

  async get(caseId: string, user: { id: string; role: string }) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId }, include: { parties: true, documents: true, hearings: true, rulings: true } });
    if (!cas) throw new NotFoundException();
    // ownership
    if (user.role === "LAWYER" && cas.filedById !== user.id) throw new ForbiddenException();
    if (user.role === "JUDGE" && cas.assignedJudgeId !== user.id) throw new ForbiddenException();
    return cas;
  }

  async list(user: { id: string; role: string }, filters: { status?: CaseStatus; divisionId?: string; q?: string; page: number; pageSize: number }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.divisionId) where.divisionId = filters.divisionId;
    if (filters.q) where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { caseNumber: { contains: filters.q, mode: "insensitive" } },
    ];
    if (user.role === "LAWYER") where.filedById = user.id;
    if (user.role === "JUDGE") where.assignedJudgeId = user.id;
    const skip = (filters.page - 1) * filters.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.case.findMany({ where, skip, take: filters.pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.case.count({ where }),
    ]);
    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  async timeline(caseId: string, user: { id: string; role: string }) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    if (user.role === "LAWYER" && cas.filedById !== user.id) throw new ForbiddenException();
    if (user.role === "JUDGE" && cas.assignedJudgeId !== user.id) throw new ForbiddenException();
    return this.prisma.caseEvent.findMany({ where: { caseId }, orderBy: { createdAt: "asc" } });
  }
}
