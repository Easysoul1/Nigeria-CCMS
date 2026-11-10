import { PrismaClient, $Enums } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

// Use Turso in production, local SQLite in dev.
const url = process.env.TURSO_DATABASE_URL;
const prisma = url?.startsWith("libsql://")
  ? new PrismaClient({
      adapter: new PrismaLibSql({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    })
  : new PrismaClient();

interface SeededUser {
  email: string;
  password: string;
  role: $Enums.Role;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

async function mustEnv(key: string): Promise<string> {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var ${key} for seeding.`);
  }
  return value;
}

async function seedUsers() {
  // The seed is idempotent and used by two non-dev paths:
  //   - the deploy entrypoints, which seed only when the DB is empty
  //   - manual `ALLOW_SEED=1 pnpm --filter @court-ccms/server db:seed`
  // Without the override, production deploys can never bootstrap their first
  // admin user, so we make the guard explicit rather than implicit.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1") {
    throw new Error(
      "Refusing to seed in production. Set ALLOW_SEED=1 if you really want to seed this database.",
    );
  }

  const users: SeededUser[] = [
    { email: "admin@ccms.example", password: await mustEnv("ADMIN_PASSWORD"), role: $Enums.Role.ADMIN, firstName: "System", lastName: "Administrator", phoneNumber: "+2348000000001" },
    { email: "registrar@ccms.example", password: await mustEnv("REGISTRAR_PASSWORD"), role: $Enums.Role.REGISTRAR, firstName: "Grace", lastName: "Okafor", phoneNumber: "+2348000000002" },
    { email: "judge@ccms.example", password: await mustEnv("JUDGE_PASSWORD"), role: $Enums.Role.JUDGE, firstName: "Honourable", lastName: "Adesanya", phoneNumber: "+2348000000003" },
    { email: "lawyer@ccms.example", password: await mustEnv("LAWYER_PASSWORD"), role: $Enums.Role.LAWYER, firstName: "Chukwuma", lastName: "Onwodi", phoneNumber: "+2348000000004" },
  ];

  const result: Record<string, string> = {};
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const up = await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: { passwordHash: hash, role: u.role, firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber, isActive: true },
      create: { email: u.email.toLowerCase(), passwordHash: hash, role: u.role, firstName: u.firstName, lastName: u.lastName, phoneNumber: u.phoneNumber, isActive: true },
    });
    result[u.role] = up.id;
  }
  return result;
}

async function seedDivisionsAndCourts() {
  const Lagos = await prisma.division.upsert({ where: { code: "L" }, update: { name: "Lagos Division" }, create: { code: "L", name: "Lagos Division" } });
  const Abuja = await prisma.division.upsert({ where: { code: "ABJ" }, update: { name: "Abuja Division" }, create: { code: "ABJ", name: "Abuja Division" } });
  const PortHarcourt = await prisma.division.upsert({ where: { code: "PH" }, update: { name: "Port Harcourt Division" }, create: { code: "PH", name: "Port Harcourt Division" } });

  const lagosCourt4 = await prisma.court.upsert({ where: { divisionId_name: { divisionId: Lagos.id, name: "Federal High Court, Lagos" } }, update: { number: "Court 4" }, create: { divisionId: Lagos.id, name: "Federal High Court, Lagos", number: "Court 4" } });
  const abujaCourt1 = await prisma.court.upsert({ where: { divisionId_name: { divisionId: Abuja.id, name: "Federal High Court, Abuja" } }, update: { number: "Court 1" }, create: { divisionId: Abuja.id, name: "Federal High Court, Abuja", number: "Court 1" } });
  const phCourt1 = await prisma.court.upsert({ where: { divisionId_name: { divisionId: PortHarcourt.id, name: "Federal High Court, Port Harcourt" } }, update: { number: "Court 1" }, create: { divisionId: PortHarcourt.id, name: "Federal High Court, Port Harcourt", number: "Court 1" } });

  return { Lagos, Abuja, PortHarcourt, lagosCourt4, abujaCourt1, phCourt1 };
}

/** Relative helper: `daysAgo(7)` = 7 days before now. */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 3600 * 1000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 3600 * 1000);
}

/** Small helper that seeds related rows only if that case has none yet. */
async function maybeSeed<T>(
  countFn: () => Promise<number>,
  insertFn: () => Promise<T>,
): Promise<void> {
  if ((await countFn()) > 0) return;
  await insertFn();
}

async function main() {
  const userIds = await seedUsers();
  const judgeId = userIds.JUDGE as string;
  const lawyerId = userIds.LAWYER as string;
  const registrarId = userIds.REGISTRAR as string;

  await prisma.lawyerProfile.upsert({
    where: { userId: lawyerId },
    update: { nbaEnrolmentNumber: "NBA-seeded-0001", verificationStatus: $Enums.VerificationStatus.VERIFIED, verifiedById: judgeId, verifiedAt: new Date() },
    create: { userId: lawyerId, nbaEnrolmentNumber: "NBA-seeded-0001", verificationStatus: $Enums.VerificationStatus.VERIFIED, verifiedById: judgeId, verifiedAt: new Date() },
  });

  const divisions = await seedDivisionsAndCourts();

  /* ---------------------------------------------------------------------- */
  /*  Case 1 — Chief Adaobi Nwosu v. FIRS   (ACTIVE, fully populated)         */
  /* ---------------------------------------------------------------------- */
  let case1 = await prisma.case.findFirst({ where: { title: "Chief Adaobi Nwosu v. Federal Inland Revenue Service" } });
  if (!case1) {
    case1 = await prisma.case.create({
      data: {
        caseNumber: `FHC/${divisions.Lagos.code}/CS/1042/${new Date().getFullYear()}`,
        title: "Chief Adaobi Nwosu v. Federal Inland Revenue Service",
        summary: "Income-tax dispute over assessment of business income.",
        reliefSought: "Declaration and refund of excess assessment.",
        caseType: $Enums.CaseType.CIVIL,
        suitTypeCode: "CS",
        status: $Enums.CaseStatus.ACTIVE,
        divisionId: divisions.Lagos.id,
        courtId: divisions.lagosCourt4.id,
        filedById: lawyerId,
        assignedJudgeId: judgeId,
        assignedRegistrarId: registrarId,
        approvedAt: daysAgo(60),
        createdAt: daysAgo(75),
      },
    });
  }

  await maybeSeed(
    () => prisma.party.count({ where: { caseId: case1!.id } }),
    async () => {
      await prisma.party.createMany({
        data: [
          { caseId: case1!.id, name: "Chief Adaobi Nwosu", role: $Enums.PartyRole.CLAIMANT, isIndividual: true, counselName: "Barr. N. Okon" },
          { caseId: case1!.id, name: "Federal Inland Revenue Service", role: $Enums.PartyRole.DEFENDANT, isIndividual: false, counselName: "FIRS Legal Department" },
        ],
      });
    },
  );

  await maybeSeed(
    () => prisma.caseEvent.count({ where: { caseId: case1!.id } }),
    async () => {
      await prisma.caseEvent.createMany({
        data: [
          { caseId: case1!.id, type: $Enums.CaseEventType.FILED, actorId: lawyerId, createdAt: daysAgo(75), metadata: {} },
          { caseId: case1!.id, type: $Enums.CaseEventType.APPROVED, actorId: registrarId, createdAt: daysAgo(60), metadata: { from: "PENDING_APPROVAL" } },
          { caseId: case1!.id, type: $Enums.CaseEventType.JUDGE_ASSIGNED, actorId: registrarId, createdAt: daysAgo(60), metadata: {} },
          { caseId: case1!.id, type: $Enums.CaseEventType.HEARING_SCHEDULED, actorId: registrarId, createdAt: daysAgo(55), metadata: { purpose: "Hearing on motion for accelerated hearing" } },
          { caseId: case1!.id, type: $Enums.CaseEventType.RULING_PUBLISHED, actorId: judgeId, createdAt: daysAgo(14), metadata: { title: "Ruling on application for accelerated hearing" } },
        ],
      });
    },
  );

  await maybeSeed(
    () => prisma.document.count({ where: { caseId: case1!.id } }),
    async () => {
      const base = case1!.id;
      await prisma.document.createMany({
        data: [
          { caseId: base, documentGroupId: `${base}-writ`, category: $Enums.DocumentCategory.PLEADING, fileName: "Writ-of-Summons.pdf", objectKey: `cases/${base}/documents/Writ-of-Summons.pdf`, fileSize: BigInt(184_320), mimeType: "application/pdf", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", scanStatus: $Enums.ScanStatus.CLEAN, ocrStatus: $Enums.OcrStatus.DONE, uploadedById: lawyerId, createdAt: daysAgo(75) },
          { caseId: base, documentGroupId: `${base}-statement`, category: $Enums.DocumentCategory.PLEADING, fileName: "Statement-of-Claim.pdf", objectKey: `cases/${base}/documents/Statement-of-Claim.pdf`, fileSize: BigInt(297_984), mimeType: "application/pdf", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", scanStatus: $Enums.ScanStatus.CLEAN, ocrStatus: $Enums.OcrStatus.DONE, uploadedById: lawyerId, createdAt: daysAgo(75) },
          { caseId: base, documentGroupId: `${base}-assessment`, category: $Enums.DocumentCategory.EVIDENCE, fileName: "Tax-Assessment-Notice-2025.pdf", objectKey: `cases/${base}/documents/Tax-Assessment-Notice-2025.pdf`, fileSize: BigInt(512_000), mimeType: "application/pdf", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", scanStatus: $Enums.ScanStatus.CLEAN, ocrStatus: $Enums.OcrStatus.DONE, uploadedById: lawyerId, createdAt: daysAgo(45) },
        ],
      });
    },
  );

  // Past completed + future scheduled hearings for the visual week grid.
  const case1HearingCount = await prisma.hearing.count({ where: { caseId: case1.id } });
  if (case1HearingCount === 0) {
    await prisma.hearing.create({ data: { caseId: case1.id, courtId: divisions.lagosCourt4.id, scheduledAt: daysAgo(14), purpose: "Hearing on motion for accelerated hearing", status: $Enums.HearingStatus.COMPLETED, scheduledById: registrarId } });
    await prisma.hearing.create({ data: { caseId: case1.id, courtId: divisions.lagosCourt4.id, scheduledAt: daysFromNow(7), purpose: "Hearing on originating summons", status: $Enums.HearingStatus.SCHEDULED, scheduledById: registrarId } });
  }

  await maybeSeed(
    () => prisma.ruling.count({ where: { caseId: case1!.id } }),
    async () => {
      await prisma.ruling.createMany({
        data: [
          {
            caseId: case1!.id,
            judgeId,
            title: "Ruling on application for accelerated hearing",
            body: "The claimant applied for an order of accelerated hearing of the originating summons. Having considered the application, the supporting affidavit and the absence of any counter-affidavit, this Court is satisfied that the interests of justice are best served by an expedited hearing.\n\nAccordingly, the application is granted. The case is adjourned to the date already fixed for the hearing on the originating summons.",
            status: $Enums.RulingStatus.PUBLISHED,
            publishedAt: daysAgo(14),
            createdAt: daysAgo(16),
          },
          {
            caseId: case1!.id,
            judgeId,
            title: "Ruling on preliminary objection (draft)",
            body: "The defendant has raised a preliminary objection that the suit is statute-barred under the relevant tax legislation. This ruling is currently in draft pending final review.",
            status: $Enums.RulingStatus.DRAFT,
            createdAt: daysAgo(3),
          },
        ],
      });
    },
  );

  /* ---------------------------------------------------------------------- */
  /*  Case 2 — Greenfield Energy v. NNPC (PENDING_APPROVAL)                  */
  /* ---------------------------------------------------------------------- */
  let case2 = await prisma.case.findFirst({ where: { title: "Greenfield Energy Ltd v. NNPC Ltd" } });
  if (!case2) {
    case2 = await prisma.case.create({
      data: {
        title: "Greenfield Energy Ltd v. NNPC Ltd",
        summary: "Contractual dispute around upstream oil and gas supply agreement.",
        reliefSought: "Damages for breach of contract.",
        caseType: $Enums.CaseType.CIVIL,
        suitTypeCode: "CS",
        status: $Enums.CaseStatus.PENDING_APPROVAL,
        divisionId: divisions.Abuja.id,
        courtId: divisions.abujaCourt1.id,
        filedById: lawyerId,
        createdAt: daysAgo(6),
      },
    });
  }

  await maybeSeed(
    () => prisma.party.count({ where: { caseId: case2!.id } }),
    async () => {
      await prisma.party.createMany({
        data: [
          { caseId: case2!.id, name: "Greenfield Energy Ltd", role: $Enums.PartyRole.CLAIMANT, isIndividual: false, counselName: "Greenfield Legal" },
          { caseId: case2!.id, name: "Nigerian National Petroleum Company Ltd", role: $Enums.PartyRole.DEFENDANT, isIndividual: false, counselName: "NNPC Legal Department" },
        ],
      });
    },
  );

  await maybeSeed(
    () => prisma.caseEvent.count({ where: { caseId: case2!.id } }),
    async () => {
      await prisma.caseEvent.createMany({
        data: [
          { caseId: case2!.id, type: $Enums.CaseEventType.FILED, actorId: lawyerId, createdAt: daysAgo(6), metadata: {} },
        ],
      });
    },
  );

  await maybeSeed(
    () => prisma.document.count({ where: { caseId: case2!.id } }),
    async () => {
      const base = case2!.id;
      await prisma.document.createMany({
        data: [
          { caseId: base, documentGroupId: `${base}-claim`, category: $Enums.DocumentCategory.PLEADING, fileName: "Statement-of-Claim.pdf", objectKey: `cases/${base}/documents/Statement-of-Claim.pdf`, fileSize: BigInt(268_288), mimeType: "application/pdf", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", scanStatus: $Enums.ScanStatus.CLEAN, ocrStatus: $Enums.OcrStatus.DONE, uploadedById: lawyerId, createdAt: daysAgo(6) },
          { caseId: base, documentGroupId: `${base}-contract`, category: $Enums.DocumentCategory.EVIDENCE, fileName: "Upstream-Supply-Agreement.pdf", objectKey: `cases/${base}/documents/Upstream-Supply-Agreement.pdf`, fileSize: BigInt(1_048_576), mimeType: "application/pdf", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", scanStatus: $Enums.ScanStatus.CLEAN, ocrStatus: $Enums.OcrStatus.DONE, uploadedById: lawyerId, createdAt: daysAgo(6) },
        ],
      });
    },
  );

  /* ---------------------------------------------------------------------- */
  /*  Case 3 — In re Chika Okonkwo (DRAFT, intentionally incomplete)         */
  /* ---------------------------------------------------------------------- */
  let case3 = await prisma.case.findFirst({ where: { title: "In re Application for Enforcement of Fundamental Rights by Chika Okonkwo" } });
  if (!case3) {
    case3 = await prisma.case.create({
      data: {
        title: "In re Application for Enforcement of Fundamental Rights by Chika Okonkwo",
        summary: "Fundamental rights enforcement application.",
        caseType: $Enums.CaseType.CIVIL,
        suitTypeCode: "FHC",
        status: $Enums.CaseStatus.DRAFT,
        divisionId: divisions.PortHarcourt.id,
        courtId: divisions.phCourt1.id,
        filedById: lawyerId,
        createdAt: daysAgo(2),
      },
    });
  }

  await maybeSeed(
    () => prisma.party.count({ where: { caseId: case3!.id } }),
    async () => {
      await prisma.party.create({
        data: { caseId: case3!.id, name: "Chika Okonkwo", role: $Enums.PartyRole.APPLICANT, isIndividual: true },
      });
    },
  );

  await maybeSeed(
    () => prisma.caseEvent.count({ where: { caseId: case3!.id } }),
    async () => {
      await prisma.caseEvent.create({
        data: { caseId: case3!.id, type: $Enums.CaseEventType.FILED, actorId: lawyerId, createdAt: daysAgo(2), metadata: {} },
      });
    },
  );

  console.log("Seed complete.");
  console.log("Case 1 (ACTIVE): parties, docs, hearings, rulings, timeline populated.");
  console.log("Case 2 (PENDING_APPROVAL): parties, docs, timeline populated.");
  console.log("Case 3 (DRAFT): partial — complete via lawyer flow to exercise submit path.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
