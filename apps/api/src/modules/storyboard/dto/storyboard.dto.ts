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
import { StoryboardStatus } from "@ai-drama-studio/types";

export class CreateStoryboardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  totalDurationSeconds?: number | null;

  @IsOptional()
  @IsEnum(StoryboardStatus)
  status?: StoryboardStatus;
}

export class UpdateStoryboardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7200)
  totalDurationSeconds?: number | null;

  @IsOptional()
  @IsEnum(StoryboardStatus)
  status?: StoryboardStatus;
}
