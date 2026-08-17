import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateScriptGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  targetDurationSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  additionalInstructions?: string;
}
