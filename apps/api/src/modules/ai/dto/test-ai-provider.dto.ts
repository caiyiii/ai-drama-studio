import { AiProviderKind } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class TestAiProviderDto {
  @IsEnum(AiProviderKind)
  provider!: AiProviderKind;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  apiKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  model!: string;
}
