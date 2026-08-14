import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateWorldDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  cosmicBackground?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  coreConflict?: string;
}
