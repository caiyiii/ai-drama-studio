import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { IMAGE_ASPECT_RATIOS } from "@ai-drama-studio/types";

export class CreateVideoGenerationDto {
  @IsString()
  @MinLength(1)
  shotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  negativePrompt?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(4096)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(16)
  @Max(4096)
  height?: number;

  @IsOptional()
  @IsIn([...IMAGE_ASPECT_RATIOS])
  aspectRatio?: (typeof IMAGE_ASPECT_RATIOS)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  fps?: number;

  @IsOptional()
  @IsInt()
  seed?: number;
}

export class CreateImageToVideoGenerationDto extends CreateVideoGenerationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  sourceAssetId?: string;
}
