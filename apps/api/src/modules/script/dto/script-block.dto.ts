import {
  IsArray,
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
import { ScriptBlockType } from "@ai-drama-studio/types";

export class CreateScriptBlockDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  order!: number;

  @IsEnum(ScriptBlockType)
  type!: ScriptBlockType;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content!: string;

  @IsOptional()
  @IsString()
  characterId?: string | null;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class UpdateScriptBlockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  order?: number;

  @IsOptional()
  @IsEnum(ScriptBlockType)
  type?: ScriptBlockType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  content?: string;

  @IsOptional()
  @IsString()
  characterId?: string | null;

  @IsOptional()
  metadata?: Record<string, unknown> | null;
}

export class ReorderScriptBlocksDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
