import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CameraAngle,
  CameraMovement,
  StoryboardShotSize,
  StoryboardShotType,
  StoryboardTransition,
} from "@ai-drama-studio/types";

export class CreateStoryboardShotDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  shotNumber!: number;

  @IsString()
  @MinLength(1)
  sceneId!: string;

  @IsOptional()
  @IsString()
  scriptBlockId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scriptBlockIds?: string[];

  @IsEnum(StoryboardShotType)
  shotType!: StoryboardShotType;

  @IsEnum(StoryboardShotSize)
  shotSize!: StoryboardShotSize;

  @IsEnum(CameraMovement)
  cameraMovement!: CameraMovement;

  @IsEnum(CameraAngle)
  cameraAngle!: CameraAngle;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  composition?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  visualDescription!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characterIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  action?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  dialogue?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  narration?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  direction?: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationSeconds!: number;

  @IsOptional()
  @IsEnum(StoryboardTransition)
  transition?: StoryboardTransition;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lighting?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mood?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visualStyle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  imagePrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  videoPrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  negativePrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  continuityNotes?: string | null;

  @IsOptional()
  cameraMovementParams?: Record<string, unknown> | null;
}

export class UpdateStoryboardShotDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  shotNumber?: number;

  @IsOptional()
  @IsEnum(StoryboardShotType)
  shotType?: StoryboardShotType;

  @IsOptional()
  @IsEnum(StoryboardShotSize)
  shotSize?: StoryboardShotSize;

  @IsOptional()
  @IsEnum(CameraMovement)
  cameraMovement?: CameraMovement;

  @IsOptional()
  @IsEnum(CameraAngle)
  cameraAngle?: CameraAngle;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  composition?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  visualDescription?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  characterIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  action?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  dialogue?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  narration?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  direction?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  durationSeconds?: number;

  @IsOptional()
  @IsEnum(StoryboardTransition)
  transition?: StoryboardTransition;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lighting?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mood?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  visualStyle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  imagePrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  videoPrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  negativePrompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  continuityNotes?: string | null;

  @IsOptional()
  cameraMovementParams?: Record<string, unknown> | null;
}

export class ReorderStoryboardShotsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
