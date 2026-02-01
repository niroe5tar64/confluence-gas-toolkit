import { describe, expect, it } from "bun:test";
import type { JobName } from "~/types";
import { SLACK_MESSAGES } from "./slack-messages";

describe("SLACK_MESSAGES", () => {
  it("confluenceUpdateNotifyJob のメッセージ設定が定義されている", () => {
    expect(SLACK_MESSAGES.confluenceUpdateNotifyJob).toBeDefined();
    expect(SLACK_MESSAGES.confluenceUpdateNotifyJob.headerText).toBeTruthy();
  });

  it("confluenceUpdateSummaryJob のメッセージ設定が定義されている", () => {
    expect(SLACK_MESSAGES.confluenceUpdateSummaryJob).toBeDefined();
    expect(SLACK_MESSAGES.confluenceUpdateSummaryJob.headerText).toBeTruthy();
  });

  it("confluenceCreateNotifyJob のメッセージ設定が定義されている", () => {
    expect(SLACK_MESSAGES.confluenceCreateNotifyJob).toBeDefined();
    expect(SLACK_MESSAGES.confluenceCreateNotifyJob.headerText).toBeTruthy();
  });

  it("すべてのJobNameに対応する設定が存在する", () => {
    const jobNames: JobName[] = [
      "confluenceUpdateNotifyJob",
      "confluenceUpdateSummaryJob",
      "confluenceCreateNotifyJob",
    ];
    for (const jobName of jobNames) {
      expect(SLACK_MESSAGES[jobName]).toBeDefined();
      expect(SLACK_MESSAGES[jobName].headerText).toBeTruthy();
    }
  });
});
