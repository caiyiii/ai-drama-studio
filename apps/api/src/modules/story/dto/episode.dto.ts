import { Type } from "class-transformer";
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
import { EpisodeStatus } from "@ai-drama-studio/types";

export class CreateEpisodeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  number!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  synopsis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  outline?: string | null;

  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  durationSeconds?: number | null;

  @IsOptional()
  storyState?: Record<string, unknown> | null;

  @IsOptional()
  metadata?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  continuityNotes?: string | null;
}

export class UpdateEpisodeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  number?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  synopsis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  outline?: string | null;

  @IsOptional()
  @IsEnum(EpisodeStatus)
  status?: EpisodeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  durationSeconds?: number | null;

  @IsOptional()
  storyState?: Record<string, unknown> | null;

  @IsOptional()
  metadata?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  continuityNotes?: string | null;
}

export class ReorderEpisodesDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
