import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class CreateStoryBibleGenerationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  instruction!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;
}

export class CreateSeasonOutlineGenerationDto {
  @IsString()
  @MinLength(1)
  seasonId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instruction?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(48)
  episodeCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(3600)
  targetDurationSeconds?: number;
}

export class CreateEpisodeOutlineGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instruction?: string;
}
