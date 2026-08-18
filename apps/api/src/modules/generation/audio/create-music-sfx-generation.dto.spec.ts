import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateMusicGenerationDto } from "../dto/create-music-generation.dto";
import { CreateSfxGenerationDto } from "../dto/create-sfx-generation.dto";

describe("music / sfx generation DTO", () => {
  it("accepts a valid music payload", async () => {
    const dto = plainToInstance(CreateMusicGenerationDto, {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 30,
      isInstrumental: true,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects music duration outside 1-600", async () => {
    const dto = plainToInstance(CreateMusicGenerationDto, {
      episodeId: "ep-1",
      prompt: "theme",
      durationSeconds: 900,
    });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "durationSeconds")).toBe(true);
  });

  it("accepts a valid sfx payload", async () => {
    const dto = plainToInstance(CreateSfxGenerationDto, {
      episodeId: "ep-1",
      prompt: "boom",
      durationSeconds: 1.2,
      category: "explosion",
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects sfx duration above 60", async () => {
    const dto = plainToInstance(CreateSfxGenerationDto, {
      episodeId: "ep-1",
      prompt: "boom",
      durationSeconds: 90,
    });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "durationSeconds")).toBe(true);
  });
});
