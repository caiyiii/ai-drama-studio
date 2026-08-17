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
import { SeasonStatus } from "@ai-drama-studio/types";

export class CreateSeasonDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  number!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  synopsis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  outline?: string | null;

  @IsOptional()
  @IsEnum(SeasonStatus)
  status?: SeasonStatus;
}

export class UpdateSeasonDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  number?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  synopsis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  outline?: string | null;

  @IsOptional()
  @IsEnum(SeasonStatus)
  status?: SeasonStatus;
}
