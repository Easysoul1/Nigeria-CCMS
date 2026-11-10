export abstract class EmailProvider {
  abstract sendPasswordReset(email: string, link: string): Promise<void>;
}

export class NullEmailProvider extends EmailProvider {
  async sendPasswordReset(email: string, link: string) {
    void email; void link;
    // no-op in dev/test
  }
}
