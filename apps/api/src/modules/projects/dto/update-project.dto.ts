import { ProjectStatus, ProjectStep } from "@prisma/client";
import { IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PROJECT_GENRES } from "@ai-drama-studio/types";

export class UpdateProjectDto {
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
  @IsIn([...PROJECT_GENRES])
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cover?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsEnum(ProjectStep)
  currentStep?: ProjectStep;
}
