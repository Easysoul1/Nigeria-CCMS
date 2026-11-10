import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const CASE_NUMBER = /^FHC\/[A-Z]+\/[A-Z]+\/\d+\/\d{4}$/;
const LAGOS = "Africa/Lagos";

/**
 * Public tracker.
 *
 * Not-found, malformed and restricted case numbers all resolve to the same
 * 404 body so that the endpoint cannot be used to confirm that a restricted
 * case exists. A small random delay keeps the response timing comparable.
 */
@Injectable()
export class PublicTrackerService {
  private readonly cache = new Map<string, { expiresAt: number; payload: unknown }>();
  private readonly rates = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  async track(caseNumber: string) {
    if (!CASE_NUMBER.test(caseNumber)) {
      await this.jitter();
      throw notPubliclyAvailable();
    }

    const cached = this.cache.get(caseNumber);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }

    const cas = await this.prisma.case.findUnique({
      where: { caseNumber },
      include: {
        parties: true,
        hearings: { where: { status: "SCHEDULED" }, orderBy: { scheduledAt: "asc" } },
      },
    });

    if (!cas || cas.isRestricted) {
      await this.jitter();
      throw notPubliclyAvailable();
    }

    const judge = cas.assignedJudgeId
      ? await this.prisma.user.findUnique({
          where: { id: cas.assignedJudgeId },
          select: { firstName: true, lastName: true },
        })
      : null;

    const next = cas.hearings
      .filter((hearing) => hearing.scheduledAt.getTime() >= Date.now())
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
    const court = next ? await this.prisma.court.findUnique({ where: { id: next.courtId } }) : null;

    const payload = {
      maskedTitle: maskTitle(cas.title, cas.parties),
      status: cas.status,
      nextHearing: next
        ? {
            date: formatLagos(next.scheduledAt, { day: "2-digit", month: "short", year: "numeric" }),
            time: formatLagos(next.scheduledAt, { hour: "2-digit", minute: "2-digit", hour12: false }),
            court: court?.name ?? "Federal High Court",
          }
        : null,
      presidingJudge: judge ? `${judge.firstName} ${judge.lastName}` : "Not assigned",
      lastUpdated: cas.updatedAt.toISOString(),
    };

    this.cache.set(caseNumber, { expiresAt: Date.now() + 45_000, payload });
    return payload;
  }

  checkRate(ip: string): boolean {
    const now = Date.now();
    const recent = (this.rates.get(ip) ?? []).filter((at) => now - at < 60_000);
    if (recent.length >= 10) return false;
    recent.push(now);
    this.rates.set(ip, recent);

    // Keep the in-memory limiter bounded under scan traffic.
    if (this.rates.size > 10_000) {
      for (const [key, hits] of this.rates) {
        if (hits.every((at) => now - at >= 60_000)) this.rates.delete(key);
      }
    }
    return true;
  }

  private async jitter() {
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.floor(Math.random() * 100)));
  }
}

function notPubliclyAvailable(): NotFoundException {
  return new NotFoundException({
    statusCode: 404,
    code: "NOT_PUBLICLY_AVAILABLE",
    message: "Case not publicly available",
  });
}

function formatLagos(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-NG", { ...options, timeZone: LAGOS }).format(date);
}

function maskTitle(title: string, parties: { name: string; isIndividual: boolean }[]): string {
  let masked = title;
  for (const party of parties) {
    if (!party.isIndividual) continue;
    const initials = party.name
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join(".");
    masked = masked.replace(party.name, `${initials}.`);
  }
  return masked;
}
