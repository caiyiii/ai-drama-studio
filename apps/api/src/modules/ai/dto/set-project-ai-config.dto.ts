import { IsOptional, IsString, MaxLength } from "class-validator";

export class SetProjectAiConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  providerId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelId?: string | null;
}
