import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateTtsGenerationDto } from "../dto/create-tts-generation.dto";

describe("tts generation DTO", () => {
  it("accepts a valid TTS payload", async () => {
    const dto = plainToInstance(CreateTtsGenerationDto, {
      episodeId: "ep-1",
      scriptBlockId: "block-1",
      voiceId: "xinghe",
      speed: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects a missing scriptBlockId", async () => {
    const dto = plainToInstance(CreateTtsGenerationDto, { episodeId: "ep-1" });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "scriptBlockId")).toBe(true);
  });
});
