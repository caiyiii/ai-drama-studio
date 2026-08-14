import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateFactionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  type?: string;

  @IsOptional()
  @IsString()
  civilizationId?: string | null;
}
