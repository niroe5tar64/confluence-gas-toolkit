import { describe, expect, it } from "bun:test";
import { SLACK_ROUTE } from "./slack-routes";

describe("SLACK_ROUTE", () => {
  it("confluenceUpdateNotifyJob のルートが定義されている", () => {
    expect(SLACK_ROUTE.confluenceUpdateNotifyJob).toBe("update-notify");
  });

  it("confluenceUpdateSummaryJob のルートが定義されている", () => {
    expect(SLACK_ROUTE.confluenceUpdateSummaryJob).toBe("update-summary");
  });

  it("confluenceCreateNotifyJob のルートが定義されている", () => {
    expect(SLACK_ROUTE.confluenceCreateNotifyJob).toBe("create-notify");
  });

  it("すべての値が文字列である", () => {
    for (const value of Object.values(SLACK_ROUTE)) {
      expect(typeof value).toBe("string");
    }
  });
});
