import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { CaseType } from "@prisma/client";

export class CreateCaseDto {
  @IsString() @MinLength(5) title!: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() reliefSought?: string;
  @IsEnum(CaseType) caseType!: CaseType;
  @IsString() @MaxLength(10) suitTypeCode!: string;
  // Prisma generates cuid() (not UUID) for Division.id / Court.id.
  @IsString() @IsNotEmpty() divisionId!: string;
  @IsOptional() @IsString() @IsNotEmpty() courtId?: string;
}
