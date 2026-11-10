import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, HearingStatus, CaseEventType, CaseStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HearingsService {
  constructor(private readonly prisma: PrismaService) {}

  async schedule(actorId: string, input: { caseId: string; courtId: string; scheduledAt: string; purpose?: string }) {
    const cas = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!cas) throw new NotFoundException();
    const when = new Date(input.scheduledAt);
    const conflict = await this.prisma.hearing.findUnique({
      where: { courtId_scheduledAt: { courtId: input.courtId, scheduledAt: when } },
    });
    if (conflict && conflict.status === "SCHEDULED") {
      throw new ConflictException({ code: "SLOT_CONFLICT", message: "Court already booked at that time" });
    }
    // judge availability check: any other SCHEDULED hearing same time for cases assigned to same judge
    const judgeBusy = await this.prisma.hearing.count({
      where: {
        scheduledAt: when,
        status: "SCHEDULED",
        case: { assignedJudgeId: cas.assignedJudgeId ?? undefined },
        NOT: { caseId: input.caseId },
      },
    });
    if (judgeBusy > 0) throw new ConflictException({ code: "JUDGE_BUSY", message: "Judge has another hearing at that time" });
    const hearing = await this.prisma.hearing.create({
      data: {
        caseId: input.caseId,
        courtId: input.courtId,
        scheduledAt: when,
        purpose: input.purpose,
        status: HearingStatus.SCHEDULED,
        scheduledById: actorId,
      },
    });
    await this.event(cas, CaseEventType.HEARING_SCHEDULED, actorId, { hearingId: hearing.id, courtId: input.courtId, when: when.toISOString() });
    return hearing;
  }

  async reschedule(id: string, actorId: string, input: { scheduledAt: string; reason: string }) {
    const h = await this.prisma.hearing.findUnique({ where: { id }, include: { case: true } });
    if (!h) throw new NotFoundException();
    const when = new Date(input.scheduledAt);
    const conflict = await this.prisma.hearing.findUnique({ where: { courtId_scheduledAt: { courtId: h.courtId, scheduledAt: when } } });
    if (conflict && conflict.id !== id && conflict.status === "SCHEDULED") {
      throw new ConflictException({ code: "SLOT_CONFLICT", message: "Court already booked at that time" });
    }
    const updated = await this.prisma.hearing.update({ where: { id }, data: { scheduledAt: when, status: HearingStatus.SCHEDULED, notes: input.reason } });
    await this.event(h.case, CaseEventType.ADJOURNED, actorId, { hearingId: id, reason: input.reason, newTime: when.toISOString() });
    return updated;
  }

  async adjourn(id: string, actorId: string, reason: string) {
    const h = await this.prisma.hearing.findUnique({ where: { id }, include: { case: true } });
    if (!h) throw new NotFoundException();
    const updated = await this.prisma.hearing.update({ where: { id }, data: { status: HearingStatus.ADJOURNED, notes: reason } });
    await this.prisma.case.update({ where: { id: h.caseId }, data: { status: CaseStatus.ADJOURNED as never } });
    await this.event(h.case, CaseEventType.ADJOURNED, actorId, { hearingId: id, reason });
    return updated;
  }

  async cancel(id: string, actorId: string) {
    const h = await this.prisma.hearing.findUnique({ where: { id }, include: { case: true } });
    if (!h) throw new NotFoundException();
    const updated = await this.prisma.hearing.update({ where: { id }, data: { status: HearingStatus.CANCELLED } });
    await this.event(h.case, CaseEventType.ADJOURNED, actorId, { hearingId: id, cancelled: true });
    return updated;
  }

  async listForDay(user: { id: string; role: string }) {
    const { start, end } = lagosDayBounds(new Date());
    const where: Record<string, unknown> = { scheduledAt: { gte: start, lte: end }, status: "SCHEDULED" };
    if (user.role === "JUDGE") where.case = { assignedJudgeId: user.id };
    return this.prisma.hearing.findMany({ where, include: { case: true, court: true }, orderBy: { scheduledAt: "asc" } });
  }

  async listForWeek(user: { id: string; role: string }) {
    const { start } = lagosDayBounds(new Date());
    const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);
    const where: Record<string, unknown> = { scheduledAt: { gte: start, lte: end }, status: "SCHEDULED" };
    if (user.role === "JUDGE") where.case = { assignedJudgeId: user.id };
    return this.prisma.hearing.findMany({ where, include: { case: true, court: true }, orderBy: { scheduledAt: "asc" } });
  }

  private async event(cas: { id: string }, type: CaseEventType, actorId: string | null, metadata: Record<string, unknown>) {
    await this.prisma.caseEvent.create({
      data: { caseId: cas.id, type, actorId, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}

function lagosDayBounds(now: Date): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  const start = new Date(`${y}-${m}-${d}T00:00:00+01:00`);
  const end = new Date(`${y}-${m}-${d}T23:59:59.999+01:00`);
  return { start, end };
}
