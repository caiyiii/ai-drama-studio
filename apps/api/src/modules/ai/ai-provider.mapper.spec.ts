import { AiProviderKind } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toPublicAiProvider } from "./ai-provider.mapper";

describe("Public AI Provider payload", () => {
  it("does not return apiKey or encryptedApiKey", () => {
    const publicProvider = toPublicAiProvider({
      id: "p1",
      name: "DeepSeek",
      provider: AiProviderKind.OPENAI_COMPATIBLE,
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      encryptedApiKey: "v1:gcm:iv:tag:cipher",
      isDefault: true,
      enabled: true,
      userId: null,
      projectId: null,
      createdAt: new Date("2026-08-17T00:00:00.000Z"),
      updatedAt: new Date("2026-08-17T00:00:00.000Z"),
    });

    expect(publicProvider).toMatchObject({
      id: "p1",
      name: "DeepSeek",
      hasApiKey: true,
      capabilities: ["CHAT", "STRUCTURED_OUTPUT"],
    });
    expect(publicProvider).not.toHaveProperty("apiKey");
    expect(publicProvider).not.toHaveProperty("encryptedApiKey");
    expect(JSON.stringify(publicProvider)).not.toContain("v1:gcm");
  });
});
