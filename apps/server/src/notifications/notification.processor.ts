import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationProvider } from "./notification-provider.interface";
import { TermiiProvider } from "./providers/termii.provider";
import { SendGridProvider } from "./providers/sendgrid.provider";

@Processor("notifications")
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly termii: TermiiProvider,
    private readonly sendgrid: SendGridProvider,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>) {
    if (job.name !== "deliver-notification") return;
    const n = await this.prisma.notification.findUnique({ where: { id: job.data.notificationId } });
    if (!n || n.status !== "PENDING") return;
    const user = await this.prisma.user.findUnique({ where: { id: n.recipientId }, select: { phoneNumber: true, email: true } });
    const provider: NotificationProvider = n.channel === "SMS" ? this.termii : this.sendgrid;
    const to = n.channel === "SMS" ? (user?.phoneNumber ?? "") : (user?.email ?? "");
    const result = await provider.send({ to, message: n.message, template: n.template });
    await this.prisma.notification.update({
      where: { id: n.id },
      data: {
        status: result.ok ? "SENT" : "FAILED",
        providerMessageId: result.providerMessageId,
        errorMessage: result.error,
        sentAt: result.ok ? new Date() : undefined,
        attempts: n.attempts + 1,
      },
    });
    if (!result.ok) throw new Error(result.error ?? "send failed");
  }
}
