import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from "class-validator";
import { CaseStatus } from "@prisma/client";

export class UpdateStatusDto {
  @IsEnum(CaseStatus) status!: CaseStatus;
}

export class ApproveCaseDto {
  @IsUUID() judgeId!: string;
  @IsUUID() courtId!: string;
  @IsOptional() preferredHearingAt?: string;
}

export class RejectCaseDto {
  @IsString() @MinLength(10) reason!: string;
}

export class AssignJudgeDto {
  @IsUUID() judgeId!: string;
}
