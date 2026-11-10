import { Injectable } from "@nestjs/common";
import { NotificationProvider, SendResult } from "../notification-provider.interface";

@Injectable()
export class TermiiProvider implements NotificationProvider {
  channel = "SMS" as const;
  async send(input: { to: string; message: string; template: string }): Promise<SendResult> {
    void input;
    // Production wiring: POST https://api.ng.termii.com/api/sms/send with TERMII_API_KEY.
    return { ok: true, providerMessageId: `dev-termii-${Date.now()}` };
  }
}
