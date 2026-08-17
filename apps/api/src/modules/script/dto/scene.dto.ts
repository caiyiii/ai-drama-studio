import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateSceneDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  number!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeOfDay?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  purpose?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conflict?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  estimatedDurationSeconds?: number | null;
}

export class UpdateSceneDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  number?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeOfDay?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  purpose?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conflict?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3600)
  estimatedDurationSeconds?: number | null;
}

export class ReorderScenesDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
