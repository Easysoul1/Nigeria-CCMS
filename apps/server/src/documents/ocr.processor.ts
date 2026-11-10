import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { ScanService } from "../scan/scan.service";
import { StorageService } from "../storage/storage.service";
import * as Tesseract from "tesseract.js";

@Processor("documents")
export class OcrProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scan: ScanService,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<{ documentId: string }>) {
    if (job.name !== "process-document") return;
    const doc = await this.prisma.document.findUnique({ where: { id: job.data.documentId } });
    if (!doc) return;
    const url = await this.storage.presignedDownload(doc.objectKey, 120).catch(() => null);
    if (!url) return;
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());

    let scan = doc.scanStatus;
    if (scan === "PENDING") {
      try {
        const r = await this.scan.scan(buf);
        scan = r === "CLEAN" ? "CLEAN" : "INFECTED";
        await this.prisma.document.update({ where: { id: doc.id }, data: { scanStatus: scan } });
      } catch {
        scan = "PENDING";
      }
    }
    if (scan !== "CLEAN") return;

    const OCR_CAP_PAGES = 25;
    let text = "";
    let status = doc.ocrStatus;
    try {
      if (doc.mimeType.startsWith("image/")) {
        const { data } = await Tesseract.recognize(buf, "eng", { logger: () => {} });
        text = data.text;
      } else if (doc.mimeType === "application/pdf") {
        const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => ({ getDocument: null as never }));
        if (getDocument) {
          const pdf = await getDocument({ data: buf }).promise;
          const pages = Math.min(pdf.numPages, OCR_CAP_PAGES);
          for (let p = 1; p <= pages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const t = (content.items as { str?: string }[]).map((i) => i.str ?? "").join(" ");
            if (t.trim().length > 10) {
              text += `\n${t}`;
            }
          }
          if (text.trim().length === 0) {
            status = "FAILED"; // rasterize+OCR not implemented in v1 without pdf-to-img
          }
        }
      } else {
        status = "NOT_APPLICABLE";
      }
      status = status === "PENDING" ? "DONE" : status;
    } catch {
      status = "FAILED";
    }
    if (text.length > 65536) text = text.slice(0, 65536);
    await this.prisma.document.update({
      where: { id: doc.id },
      data: { ocrText: text || null, ocrStatus: status as never },
    });
  }
}
