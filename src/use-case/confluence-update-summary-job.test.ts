import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { SLACK_ROUTE } from "~/config";
import * as services from "~/services";

describe("confluenceUpdateSummaryJob", () => {
  let sendSlackMessageSpy: ReturnType<typeof spyOn>;
  let sendSlackExceptionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // 各サービス関数をモック
    spyOn(services, "parseJobData").mockReturnValue({
      timestamp: new Date().toISOString(),
      originalVersions: { "123": 1 },
    });
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [
        {
          id: "123",
          type: "page",
          title: "Test Page",
          version: { when: new Date(), number: 2, by: { displayName: "Test User" } },
          _links: { webui: "/pages/123" },
        },
      ],
      _links: { base: "https://confluence.example.com" },
    });
    spyOn(services, "convertSearchResultsToSummaryPayload").mockReturnValue({
      text: "summary",
      blocks: [],
    });
    spyOn(services, "updateJobData").mockImplementation(() => {});

    sendSlackMessageSpy = spyOn(services, "sendSlackMessage").mockResolvedValue(undefined);
    sendSlackExceptionSpy = spyOn(services, "sendSlackException").mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  it("sendSlackMessage は SLACK_ROUTE.confluenceUpdateSummaryJob のキーで呼び出される", async () => {
    const { confluenceUpdateSummaryJob } = await import("./confluence-update-summary-job");
    await confluenceUpdateSummaryJob();

    expect(sendSlackMessageSpy).toHaveBeenCalled();
    const callArgs = sendSlackMessageSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceUpdateSummaryJob);
  });

  it("エラー時に sendSlackException は SLACK_ROUTE.confluenceUpdateSummaryJob のキーで呼び出される", async () => {
    // fetchRecentChanges がエラーをスロー
    spyOn(services, "fetchRecentChanges").mockRejectedValue(new Error("API Error"));

    const { confluenceUpdateSummaryJob } = await import("./confluence-update-summary-job");
    await confluenceUpdateSummaryJob();

    expect(sendSlackExceptionSpy).toHaveBeenCalled();
    const callArgs = sendSlackExceptionSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceUpdateSummaryJob);
  });
});
