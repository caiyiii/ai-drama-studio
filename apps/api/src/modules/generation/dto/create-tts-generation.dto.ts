import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { TTS_AUDIO_FORMATS, TTS_MAX_TEXT_LENGTH } from "@ai-drama-studio/types";

export class CreateTtsGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsString()
  @MinLength(1)
  scriptBlockId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(TTS_MAX_TEXT_LENGTH)
  text?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  characterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  voiceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(4)
  speed?: number;

  @IsOptional()
  @IsNumber()
  @Min(-20)
  @Max(20)
  pitch?: number;

  @IsOptional()
  @IsIn([...TTS_AUDIO_FORMATS])
  format?: (typeof TTS_AUDIO_FORMATS)[number];
}
