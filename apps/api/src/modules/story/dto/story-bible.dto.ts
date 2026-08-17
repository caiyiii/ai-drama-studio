import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class StoryBibleRulesDto {
  @IsOptional()
  worldRules?: string[];

  @IsOptional()
  characterRules?: string[];

  @IsOptional()
  narrativeRules?: string[];

  @IsOptional()
  forbidden?: string[];
}

export class CreateStoryBibleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  premise?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  theme?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyPromise?: string | null;

  @IsOptional()
  rules?: StoryBibleRulesDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  timelineSummary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  continuityNotes?: string | null;
}

export class UpdateStoryBibleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logline?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  premise?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  theme?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  style?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  storyPromise?: string | null;

  @IsOptional()
  rules?: StoryBibleRulesDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  timelineSummary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  continuityNotes?: string | null;
}
