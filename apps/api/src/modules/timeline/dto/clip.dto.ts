import { TimelineClipSourceType, TimelineClipType } from "@ai-drama-studio/types";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class CreateTimelineClipDto {
  @IsString()
  @MinLength(1)
  trackId!: string;

  @IsEnum(TimelineClipType)
  type!: TimelineClipType;

  @IsEnum(TimelineClipSourceType)
  sourceType!: TimelineClipSourceType;

  @IsString()
  @MinLength(1)
  sourceId!: string;

  @IsString()
  @MinLength(1)
  assetId!: string;

  @IsNumber()
  @Min(0)
  startTime!: number;

  @IsNumber()
  @Min(0.0001)
  duration!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sourceStartTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  sourceDuration?: number;

  @IsOptional()
  @IsInt()
  zIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}

export class UpdateTimelineClipDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  startTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sourceStartTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  sourceDuration?: number;

  @IsOptional()
  @IsInt()
  zIndex?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
