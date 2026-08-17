import { AiProviderKind } from "@prisma/client";
import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";

export class TestAiProviderDto {
  @IsEnum(AiProviderKind)
  provider!: AiProviderKind;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  baseUrl!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  apiKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  model!: string;
}
