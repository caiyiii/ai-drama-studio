import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { CharacterStatus } from "@ai-drama-studio/types";

export class CharacterVoiceProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  voiceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  language?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.25)
  @Max(4)
  speed?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-20)
  @Max(20)
  pitch?: number | null;
}

export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  alias?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20000)
  age?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  race?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  identity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  role?: string | null;

  @IsOptional()
  @IsString()
  civilizationId?: string | null;

  @IsOptional()
  @IsString()
  factionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  personality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  appearance?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  background?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  motivation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  goal?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  conflict?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  ability?: string | null;

  @IsOptional()
  @IsEnum(CharacterStatus)
  status?: CharacterStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => CharacterVoiceProfileDto)
  voiceProfile?: CharacterVoiceProfileDto | null;
}
