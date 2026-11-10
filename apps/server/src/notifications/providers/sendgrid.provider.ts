import { Injectable } from "@nestjs/common";
import { NotificationProvider, SendResult } from "../notification-provider.interface";

@Injectable()
export class SendGridProvider implements NotificationProvider {
  channel = "EMAIL" as const;
  async send(input: { to: string; message: string; template: string }): Promise<SendResult> {
    void input;
    return { ok: true, providerMessageId: `dev-sendgrid-${Date.now()}` };
  }
}
