import { Module } from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { StorageService } from "../storage/storage.service";
import { ScanService } from "../scan/scan.service";
import { OcrProcessor } from "./ocr.processor";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [BullModule.registerQueue({ name: "documents" })],
  providers: [DocumentsService, StorageService, ScanService, OcrProcessor],
  controllers: [DocumentsController],
  exports: [DocumentsService, StorageService, ScanService],
})
export class DocumentsModule {}
