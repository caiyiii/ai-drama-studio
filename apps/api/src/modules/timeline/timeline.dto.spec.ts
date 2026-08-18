import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  TimelineClipSourceType,
  TimelineClipType,
  TimelineTrackType,
} from "@ai-drama-studio/types";
import { CreateTimelineClipDto, UpdateTimelineClipDto } from "./dto/clip.dto";
import { CreateTimelineTrackDto } from "./dto/track.dto";

describe("timeline DTOs", () => {
  it("accepts a valid clip payload", async () => {
    const dto = plainToInstance(CreateTimelineClipDto, {
      trackId: "tr-1",
      type: TimelineClipType.AUDIO,
      sourceType: TimelineClipSourceType.SCRIPT_BLOCK,
      sourceId: "block-1",
      assetId: "asset-1",
      startTime: 0,
      duration: 1.5,
      volume: 1,
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it("rejects negative startTime and zero duration", async () => {
    const dto = plainToInstance(CreateTimelineClipDto, {
      trackId: "tr-1",
      type: TimelineClipType.VIDEO,
      sourceType: TimelineClipSourceType.STORYBOARD_SHOT,
      sourceId: "shot-1",
      assetId: "asset-1",
      startTime: -1,
      duration: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "startTime")).toBe(true);
    expect(errors.some((item) => item.property === "duration")).toBe(true);
  });

  it("rejects volume outside 0-1 on update", async () => {
    const dto = plainToInstance(UpdateTimelineClipDto, { volume: 1.4 });
    const errors = await validate(dto);
    expect(errors.some((item) => item.property === "volume")).toBe(true);
  });

  it("accepts a valid track payload", async () => {
    const dto = plainToInstance(CreateTimelineTrackDto, {
      type: TimelineTrackType.MUSIC,
      name: "MUSIC",
      volume: 0.8,
      muted: false,
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});
