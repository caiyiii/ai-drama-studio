import { IsOptional, IsString, ValidateIf } from "class-validator";

export class SetProjectAiProviderDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  aiProviderId?: string | null;
}
