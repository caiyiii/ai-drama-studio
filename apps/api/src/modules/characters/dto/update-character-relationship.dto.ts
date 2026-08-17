import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CharacterRelationType } from "@ai-drama-studio/types";

export class UpdateCharacterRelationshipDto {
  @IsOptional()
  @IsEnum(CharacterRelationType)
  type?: CharacterRelationType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  strength?: number;
}
