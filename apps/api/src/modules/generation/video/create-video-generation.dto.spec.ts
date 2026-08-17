import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  CreateImageToVideoGenerationDto,
  CreateVideoGenerationDto,
} from "../dto/create-video-generation.dto";

describe("video generation DTO", () => {
  it("accepts a valid VIDEO payload", async () => {
    const dto = plainToInstance(CreateVideoGenerationDto, {
      shotId: "shot-1",
      durationSeconds: 5,
      width: 1280,
      height: 720,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects a missing shotId", async () => {
    const dto = plainToInstance(CreateVideoGenerationDto, { durationSeconds: 5 });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "shotId")).toBe(true);
  });

  it("accepts IMAGE_TO_VIDEO sourceAssetId", async () => {
    const dto = plainToInstance(CreateImageToVideoGenerationDto, {
      shotId: "shot-1",
      sourceAssetId: "img-1",
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
