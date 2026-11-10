import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { CaseType } from "@prisma/client";

export class UpdateCaseDto {
  @IsOptional() @IsString() @MinLength(5) title?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() reliefSought?: string;
  @IsOptional() @IsEnum(CaseType) caseType?: CaseType;
  @IsOptional() @IsString() @MaxLength(10) suitTypeCode?: string;
  @IsOptional() @IsUUID() divisionId?: string;
  @IsOptional() @IsUUID() courtId?: string;
  @IsOptional() isRestricted?: boolean;
}
