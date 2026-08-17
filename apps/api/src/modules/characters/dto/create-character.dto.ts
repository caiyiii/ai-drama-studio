import { Type } from "class-transformer";
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
import { CharacterStatus } from "@ai-drama-studio/types";

export class CreateCharacterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

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
}
