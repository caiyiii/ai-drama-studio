import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { IMAGE_ASPECT_RATIOS, IMAGE_GENERATION_MAX_COUNT } from "@ai-drama-studio/types";

export class CreateImageGenerationDto {
  @IsString()
  @MinLength(1)
  shotId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  promptOverride?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  negativePromptOverride?: string;

  @IsOptional()
  @IsIn([...IMAGE_ASPECT_RATIOS])
  aspectRatio?: (typeof IMAGE_ASPECT_RATIOS)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4096)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4096)
  height?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(IMAGE_GENERATION_MAX_COUNT)
  count?: number;

  @IsOptional()
  @IsInt()
  seed?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  style?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  referenceAssetIds?: string[];
}
