import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ScriptStatus } from "@ai-drama-studio/types";

export class CreateScriptDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  estimatedDurationSeconds?: number | null;

  @IsOptional()
  @IsEnum(ScriptStatus)
  status?: ScriptStatus;
}

export class UpdateScriptDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  summary?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  estimatedDurationSeconds?: number | null;

  @IsOptional()
  @IsEnum(ScriptStatus)
  status?: ScriptStatus;
}
