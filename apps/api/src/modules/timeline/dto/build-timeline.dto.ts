import { IsBoolean, IsOptional } from "class-validator";

export class BuildTimelineDto {
  @IsOptional()
  @IsBoolean()
  rebuild?: boolean;
}
