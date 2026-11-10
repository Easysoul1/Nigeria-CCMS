import type { Request, Response } from "express";
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { TokenService } from "./services/token.service";
import { Public } from "../common/decorators/public.decorator";
import { AuthUser, CurrentUser } from "../common/decorators/current-user.decorator";

const cookieOpts = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: maxAgeMs,
  path: "/",
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly tokens: TokenService) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const issued = await this.auth.login(body.email, body.password);
    res.cookie("access_token", issued.accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie("refresh_token", issued.refreshToken, cookieOpts(7 * 24 * 3600 * 1000));
    const csrf = `${Date.now()}`;
    res.cookie("csrf_token", csrf, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600 * 1000 });
    return { accessToken: issued.accessToken, expiresIn: "15m" };
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.refresh_token as string | undefined;
    if (!raw) throw new UnauthorizedException("Missing refresh token");
    const issued = await this.tokens.rotate(raw, { userAgent: req.headers["user-agent"] as string, ipAddress: req.ip });
    res.cookie("access_token", issued.accessToken, cookieOpts(15 * 60 * 1000));
    res.cookie("refresh_token", issued.refreshToken, cookieOpts(7 * 24 * 3600 * 1000));
    return { accessToken: issued.accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.tokens.revoke(req.cookies?.refresh_token as string | undefined);
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
  }

  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Req() req: unknown, @Res({ passthrough: true }) res: Response) {
    const userId = (req as { user?: { id?: string } }).user?.id ?? "";
    await this.tokens.revokeAll(userId);
    res.clearCookie("access_token", { path: "/" });
    res.clearCookie("refresh_token", { path: "/" });
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: { current: string; next: string },
  ) {
    if (!user) throw new UnauthorizedException("Unauthenticated");
    await this.auth.changePassword(user, body.current, body.next);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgot(@Body() body: { email: string }) {
    await this.auth.forgotPassword(body.email);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(@Body() body: { email: string; token: string; password: string }) {
    await this.auth.resetPassword(body.token, body.email, body.password);
  }

  @Public()
  @Post("register-lawyer")
  @HttpCode(HttpStatus.CREATED)
  async registerLawyer(@Body() body: unknown) {
    return this.auth.createLawyerRequest(body as never);
  }

  @Get("me")
  async me(@Req() req: unknown) {
    const user = (req as { user?: unknown }).user;
    if (!user) throw new UnauthorizedException("Unauthenticated");
    return user;
  }

  @Get("profile")
  async profile(@Req() req: unknown) {
    const user = (req as { user?: { id: string } }).user;
    if (!user) throw new UnauthorizedException("Unauthenticated");
    return this.auth.getProfile(user.id);
  }

  @Get("csrf")
  csrf(@Res({ passthrough: true }) res: Response) {
    const csrf = `${Date.now()}`;
    res.cookie("csrf_token", csrf, { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });
    return { csrfToken: csrf };
  }
}
