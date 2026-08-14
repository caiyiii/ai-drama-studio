import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCivilizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  philosophy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  society?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  culture?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  technology?: string;
}
