import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationChannel } from "@prisma/client";

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("notifications") private readonly queue: Queue,
  ) {}

  async enqueue(input: { recipientId: string; caseId?: string; channel: NotificationChannel; template: string; message: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: input.recipientId }, select: { phoneNumber: true, email: true } });
    if (!user) return;
    // consent check
    const consent = await this.prisma.consentRecord.findFirst({
      where: { userId: input.recipientId, purpose: "HEARING_NOTIFICATIONS", channel: input.channel, withdrawnAt: null },
    });
    if (!consent) {
      this.logger.debug(`skipping notification: no consent for ${input.recipientId}/${input.channel}`);
      return null;
    }
    const created = await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        caseId: input.caseId,
        channel: input.channel,
        template: input.template,
        message: input.message,
        status: "PENDING",
      },
    });
    await this.queue.add("deliver-notification", { notificationId: created.id }, { attempts: 5, backoff: { type: "exponential", delay: 3000 } });
    return created;
  }
}
