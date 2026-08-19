import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateLocationDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  environment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  atmosphere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visualStyle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  environment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  atmosphere?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visualStyle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
