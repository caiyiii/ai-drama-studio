import { TimelineStatus } from "@ai-drama-studio/types";
import { IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";

export class UpdateTimelineDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  fps?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  aspectRatio?: string;

  @IsOptional()
  @IsEnum(TimelineStatus)
  status?: TimelineStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
