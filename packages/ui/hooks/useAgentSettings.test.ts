import { describe, expect, test } from "bun:test";
import { parseAgentSettings } from "./useAgentSettings";

describe("parseAgentSettings", () => {
  test("uses Pi-only defaults for missing or invalid data", () => {
    expect(parseAgentSettings(null)).toEqual({
      selectedMode: "review",
      reviewProfileId: "builtin:default",
      piModel: "",
      piThinking: "medium",
      guidePiModel: "",
      guidePiThinking: "medium",
    });
    expect(parseAgentSettings("invalid").selectedMode).toBe("review");
    expect(parseAgentSettings("null")).toEqual(parseAgentSettings(null));
    expect(parseAgentSettings('{"selectedMode":"invalid","piModel":5}')).toEqual(parseAgentSettings(null));
  });

  test("retains Pi choices from the existing settings shape", () => {
    expect(parseAgentSettings(JSON.stringify({
      selectedMode: "guide",
      reviewProfileByEngine: { pi: "skill:security" },
      reviewProfileId: "skill:legacy",
      pi: { model: "openai/gpt-5", thinking: "high" },
      guidePi: { model: "anthropic/claude-sonnet", thinking: "low" },
    }))).toEqual({
      selectedMode: "guide",
      reviewProfileId: "skill:security",
      piModel: "openai/gpt-5",
      piThinking: "high",
      guidePiModel: "anthropic/claude-sonnet",
      guidePiThinking: "low",
    });
  });

  test("round-trips the new shape and accepts the old flat profile", () => {
    const settings = { ...parseAgentSettings(null), piModel: "model", reviewProfileId: "skill:flat" };
    expect(parseAgentSettings(JSON.stringify(settings))).toEqual(settings);
  });
});
