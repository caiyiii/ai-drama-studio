import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWorldGenerationDto {
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
}
