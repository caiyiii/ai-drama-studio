import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateLocationGenerationDto {
  @IsString()
  @MaxLength(4000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  detailLevel?: string;
}
