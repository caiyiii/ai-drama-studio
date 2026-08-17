import { describe, expect, it } from "vitest";
import { getSystemProviderDisplayName } from "./system-provider-label";

describe("System provider display name", () => {
  it("labels DeepSeek system fallback without implying it is a database provider", () => {
    expect(getSystemProviderDisplayName("https://api.deepseek.com")).toBe(
      "DeepSeek（系统）",
    );
  });

  it("keeps a generic label for other system endpoints", () => {
    expect(getSystemProviderDisplayName("https://api.openai.com/v1")).toBe(
      "系统 Provider",
    );
  });
});
