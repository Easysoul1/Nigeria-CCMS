import { ForbiddenException, Injectable, NotFoundException, UnsupportedMediaTypeException } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import * as crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "./document.constants";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @InjectQueue("documents") private readonly queue: Queue,
  ) {}

  async upload(caseId: string, actorId: string, file: Express.Multer.File, category: string, documentGroupId?: string) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor || !this.canEdit(actor.role, cas.filedById, actorId)) throw new ForbiddenException();
    if (!file || file.size > MAX_FILE_BYTES) {
      throw new ForbiddenException(`File exceeds ${MAX_FILE_BYTES} bytes`);
    }
    const mime = detectMime(file.buffer) ?? file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      throw new UnsupportedMediaTypeException("Allowed: PDF, DOCX, JPG, PNG");
    }
    const sanitized = file.originalname.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200);
    const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");

    const groupId = documentGroupId ?? crypto.randomUUID();
    const agg = await this.prisma.document.aggregate({ where: { caseId, documentGroupId: groupId }, _max: { version: true } });
    const version = (agg._max.version ?? 0) + 1;

    const key = `cases/${caseId}/${groupId}/v${version}/${crypto.randomUUID()}-${sanitized}`;
    await this.storage.putObject(key, file.buffer, mime);

    const doc = await this.prisma.document.create({
      data: {
        caseId,
        documentGroupId: groupId,
        version,
        category: (category as "PLEADING" | "EVIDENCE" | "ORDER" | "NOTE") ?? "EVIDENCE",
        fileName: sanitized,
        objectKey: key,
        fileSize: BigInt(file.size),
        mimeType: mime,
        checksumSha256: sha256,
        uploadedById: actorId,
        scanStatus: "PENDING",
        ocrStatus: "PENDING",
      },
    });
    await this.queue.add("process-document", { documentId: doc.id }, { attempts: 3, backoff: { type: "exponential", delay: 5000 } });
    return doc;
  }

  private canEdit(role: string, filedById: string, actorId: string): boolean {
    if (role === "ADMIN" || role === "REGISTRAR") return true;
    if (role === "LAWYER" && filedById === actorId) return true;
    return false;
  }

  async presignedDownload(documentId: string, actorId: string, auditMeta: { ipAddress?: string; userAgent?: string; requestId?: string }) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException();
    if (doc.scanStatus !== "CLEAN") throw new ForbiddenException("Document not available");
    const cas = await this.prisma.case.findUnique({ where: { id: doc.caseId } });
    if (!cas) throw new NotFoundException();
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    const allowed =
      actor?.role === "ADMIN" || actor?.role === "REGISTRAR" ||
      (actor?.role === "LAWYER" && cas.filedById === actorId) ||
      (actor?.role === "JUDGE" && cas.assignedJudgeId === actorId);
    if (!allowed) throw new ForbiddenException();
    const url = await this.storage.presignedDownload(doc.objectKey, 90);
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: "DOCUMENT_DOWNLOADED",
        entity: "Document",
        entityId: documentId,
        newValues: { caseId: doc.caseId, objectKey: doc.objectKey } as Prisma.InputJsonValue,
        ipAddress: auditMeta.ipAddress,
        userAgent: auditMeta.userAgent,
        requestId: auditMeta.requestId,
      },
    });
    return url;
  }

  /**
   * List documents for a case. Ownership scoping mirrors CasesService.timeline:
   * lawyers see only cases they filed; judges see only cases assigned to them;
   * registrars and admins see everything.
   */
  async list(caseId: string, user: { id: string; role: string }) {
    const cas = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!cas) throw new NotFoundException();
    if (user.role === "LAWYER" && cas.filedById !== user.id) throw new ForbiddenException();
    if (user.role === "JUDGE" && cas.assignedJudgeId !== user.id) throw new ForbiddenException();

    const rows = await this.prisma.document.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        category: true,
        scanStatus: true,
        ocrStatus: true,
        fileSize: true,
        createdAt: true,
      },
    });
    // BigInt is not JSON-serializable via res.json — coerce to Number.
    return rows.map((d) => ({ ...d, fileSize: Number(d.fileSize) }));
  }

  async search(q: string) {
    const clean = q.trim();
    if (clean.length < 2) return [];
    const docs = await this.prisma.document.findMany({
      where: {
        OR: [
          { fileName: { contains: clean } },
          { ocrText: { contains: clean } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return docs;
  }
}


function detectMime(buf: Buffer): string | null {
  if (buf.length < 4) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf"; // %PDF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) {
    // ZIP; accept DOCX (contains word/document.xml typically within first 4KB)
    const head = buf.subarray(0, Math.min(buf.length, 65536)).toString("utf8");
    if (head.includes("word/")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/zip";
  }
  return null;
}
