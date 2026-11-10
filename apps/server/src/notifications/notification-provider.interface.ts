export interface SendResult { ok: boolean; providerMessageId?: string; error?: string }

export interface NotificationProvider {
  channel: "SMS" | "EMAIL";
  send(input: { to: string; message: string; template: string }): Promise<SendResult>;
}
