import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateStoryboardGenerationDto {
  @IsString()
  @MinLength(1)
  episodeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  additionalInstructions?: string;
}
