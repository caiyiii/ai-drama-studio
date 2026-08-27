import { AiCapability, AiProviderKind } from "@prisma/client";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateAiProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

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

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(AiCapability, { each: true })
  capabilities?: AiCapability[];
}
