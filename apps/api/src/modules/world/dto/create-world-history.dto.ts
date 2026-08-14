import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreateWorldHistoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number;
}
