import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RulingStatus, CaseEventType, Prisma } from "@prisma/client";

export type CitationKind = "case" | "statute" | "book" | "other";
export type Citation = { kind: CitationKind; citation: string; note?: string };

const CITATION_KINDS = new Set<CitationKind>(["case", "statute", "book", "other"]);
const MAX_CITATIONS = 50;
const MAX_CITATION_LEN = 500;
const MAX_NOTE_LEN = 500;

@Injectable()
export class RulingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    caseId: string;
    hearingId?: string;
    judgeId: string;
    title: string;
    body: string;
    citations?: unknown;
  }) {
    const cas = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!cas || cas.assignedJudgeId !== input.judgeId) throw new ForbiddenException();
    const citations = sanitizeCitations(input.citations);
    return this.prisma.ruling.create({
      data: {
        caseId: input.caseId,
        hearingId: input.hearingId ?? null,
        judgeId: input.judgeId,
        title: input.title,
        body: input.body,
        citations: citations === null ? Prisma.JsonNull : (citations as unknown as Prisma.InputJsonValue),
        status: RulingStatus.DRAFT,
      },
    });
  }

  async update(
    id: string,
    judgeId: string,
    input: { title?: string; body?: string; citations?: unknown },
  ) {
    const r = await this.prisma.ruling.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    if (r.judgeId !== judgeId) throw new ForbiddenException();
    if (r.status === "PUBLISHED") throw new ForbiddenException("Published rulings are immutable");

    const data: Prisma.RulingUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.body !== undefined) data.body = input.body;
    if (input.citations !== undefined) {
      const citations = sanitizeCitations(input.citations);
      data.citations = citations === null ? Prisma.JsonNull : (citations as unknown as Prisma.InputJsonValue);
    }
    return this.prisma.ruling.update({ where: { id }, data });
  }

  async publish(id: string, judgeId: string) {
    const r = await this.prisma.ruling.findUnique({ where: { id }, include: { case: true } });
    if (!r) throw new NotFoundException();
    if (r.judgeId !== judgeId) throw new ForbiddenException();
    if (r.status === "PUBLISHED") throw new ForbiddenException("Already published");
    const updated = await this.prisma.ruling.update({
      where: { id },
      data: { status: RulingStatus.PUBLISHED, publishedAt: new Date() },
    });
    await this.prisma.caseEvent.create({
      data: {
        caseId: r.caseId,
        type: CaseEventType.RULING_PUBLISHED,
        actorId: judgeId,
        metadata: { rulingId: id, title: r.title },
      },
    });
    return updated;
  }

  async list(caseId: string) {
    return this.prisma.ruling.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  }
}

/**
 * Convert an arbitrary payload from the client into a valid Citation[] (or
 * null). The client sends the same shape we want, but we do not trust it: bad
 * payloads are dropped, not failed, so a half-edited form still saves.
 */
function sanitizeCitations(raw: unknown): Citation[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) throw new BadRequestException("citations must be an array");
  if (raw.length > MAX_CITATIONS) {
    throw new BadRequestException(`citations must be at most ${MAX_CITATIONS} entries`);
  }
  const out: Citation[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const kindRaw = typeof obj.kind === "string" ? obj.kind.toLowerCase() : "";
    const kind: CitationKind = CITATION_KINDS.has(kindRaw as CitationKind)
      ? (kindRaw as CitationKind)
      : "other";
    const citation = typeof obj.citation === "string" ? obj.citation.trim() : "";
    if (citation.length < 3) continue;
    const note = typeof obj.note === "string" ? obj.note.trim() : "";
    out.push({
      kind,
      citation: citation.slice(0, MAX_CITATION_LEN),
      ...(note ? { note: note.slice(0, MAX_NOTE_LEN) } : {}),
    });
  }
  return out.length === 0 ? null : out;
}
