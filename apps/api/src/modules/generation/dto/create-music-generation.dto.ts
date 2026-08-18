import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import {
  MUSIC_DURATION_MAX_SECONDS,
  MUSIC_DURATION_MIN_SECONDS,
} from "@ai-drama-studio/config";

export class CreateMusicGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  prompt!: string;

  @IsNumber()
  @Min(MUSIC_DURATION_MIN_SECONDS)
  @Max(MUSIC_DURATION_MAX_SECONDS)
  durationSeconds!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instrumentation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tempo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;

  @IsOptional()
  @IsBoolean()
  isInstrumental?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  negativePrompt?: string;

  @IsOptional()
  @IsBoolean()
  loopable?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  intensity?: string;
}
