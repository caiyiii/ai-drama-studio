import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PROJECT_GENRES } from "@ai-drama-studio/types";

export class CreateProjectDto {
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
  @IsIn([...PROJECT_GENRES])
  genre?: string;
}
