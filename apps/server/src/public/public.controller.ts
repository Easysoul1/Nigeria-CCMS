import { Controller, Get, Param, Req, HttpException, HttpStatus } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { PublicTrackerService } from "./public-tracker.service";

@Public()
@Controller("public")
export class PublicController {
  constructor(private readonly svc: PublicTrackerService) {}

  @Get("track/:caseNumber")
  async track(@Param("caseNumber") caseNumber: string, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    if (process.env.CAPTCHA_REQUIRED === "true") {
      const token = req.headers["x-captcha-token"];
      if (!token || (Array.isArray(token) ? !token[0] : !token)) {
        throw new HttpException({ statusCode: 400, code: "CAPTCHA_REQUIRED", message: "Captcha required" }, HttpStatus.BAD_REQUEST);
      }
    }
    const ip = req.ip ?? (req.headers["x-forwarded-for"] as string) ?? "unknown";
    if (!this.svc.checkRate(ip)) {
      throw new HttpException({ statusCode: 429, code: "RATE_LIMIT", message: "Too many requests" }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return this.svc.track(caseNumber.trim().toUpperCase());
  }
}
