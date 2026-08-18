import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  SFX_DURATION_MAX_SECONDS,
  SFX_DURATION_MIN_SECONDS,
} from "@ai-drama-studio/config";

export class CreateSfxGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsNumber()
  @Min(SFX_DURATION_MIN_SECONDS)
  @Max(SFX_DURATION_MAX_SECONDS)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  intensity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  negativePrompt?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  sceneId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  shotId?: string;
}
