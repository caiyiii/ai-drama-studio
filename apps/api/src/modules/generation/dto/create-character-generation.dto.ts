import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateCharacterGenerationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  detailLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  age?: string;

  @IsOptional()
  @IsString()
  civilizationId?: string | null;

  @IsOptional()
  @IsString()
  factionId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  appearance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  background?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  goal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  motivation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  conflict?: string;
}
