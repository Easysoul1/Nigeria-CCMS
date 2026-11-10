import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsService } from "./notifications.service";
import { NotificationProcessor } from "./notification.processor";
import { TermiiProvider } from "./providers/termii.provider";
import { SendGridProvider } from "./providers/sendgrid.provider";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" })],
  providers: [NotificationsService, NotificationProcessor, TermiiProvider, SendGridProvider],
  exports: [NotificationsService, TermiiProvider, SendGridProvider],
})
export class NotificationsModule {}
