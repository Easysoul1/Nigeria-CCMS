import type { Request } from "express";
import { Body, Controller, Get, Param, Post, Query, Req, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DocumentsService } from "./documents.service";

@Controller("cases/:caseId/documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @Param("caseId") caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("category") category: string,
    @Body("documentGroupId") groupId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.upload(caseId, user.id, file, category ?? "EVIDENCE", groupId || undefined);
  }

  // Previously missing — the client's Documents tab called this and always 404'd.
  @Get()
  async list(
    @Param("caseId") caseId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.service.list(caseId, user);
  }

  @Get("search")
  async search(@Query("q") q: string, @CurrentUser() user: { id: string; role: string }) {
    if (!["ADMIN", "REGISTRAR", "JUDGE", "LAWYER"].includes(user.role)) return [];
    return this.service.search(q);
  }

  @Get(":id/download")
  async download(@Param("id") id: string, @CurrentUser() user: { id: string }, @Req() req: Request) {
    const url = await this.service.presignedDownload(id, user.id, { ipAddress: req.ip, userAgent: req.headers["user-agent"] as string });
    return { url, expiresIn: 90 };
  }
}
