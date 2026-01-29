import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { SLACK_ROUTE } from "~/config";
import * as services from "~/services";

describe("confluenceUpdateNotifyJob", () => {
  let sendSlackMessageSpy: ReturnType<typeof spyOn>;
  let sendSlackExceptionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    // 各サービス関数をモック
    spyOn(services, "isJobExecutionAllowed").mockReturnValue(true);
    spyOn(services, "parseJobData").mockReturnValue({ timestamp: new Date().toISOString() });
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [],
      _links: { base: "https://confluence.example.com" },
    });
    spyOn(services, "sortSearchResultsByUpdatedAtAsc").mockReturnValue([]);
    spyOn(services, "updateJobData").mockImplementation(() => {});

    sendSlackMessageSpy = spyOn(services, "sendSlackMessage").mockResolvedValue(undefined);
    sendSlackExceptionSpy = spyOn(services, "sendSlackException").mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  it("sendSlackMessage は SLACK_ROUTE.confluenceUpdateNotifyJob のキーで呼び出される", async () => {
    // 1件の検索結果をモック
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [
        {
          id: "123",
          type: "page",
          title: "Test Page",
          version: { when: new Date(), number: 1, by: { displayName: "Test User" } },
          _links: { webui: "/pages/123" },
        },
      ],
      _links: { base: "https://confluence.example.com" },
    });
    spyOn(services, "sortSearchResultsByUpdatedAtAsc").mockReturnValue([
      {
        id: "123",
        type: "page",
        title: "Test Page",
        version: { when: new Date(), number: 1, by: { displayName: "Test User" } },
        _links: { webui: "/pages/123" },
      },
    ]);
    spyOn(services, "convertSearchResultToMessagePayload").mockReturnValue({
      text: "test",
      blocks: [],
    });

    const { confluenceUpdateNotifyJob } = await import("./confluence-update-notify-job");
    await confluenceUpdateNotifyJob();

    // 2つ目の引数が正しいキーであることを確認
    expect(sendSlackMessageSpy).toHaveBeenCalled();
    const callArgs = sendSlackMessageSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceUpdateNotifyJob);
  });

  it("エラー時に sendSlackException は SLACK_ROUTE.confluenceUpdateNotifyJob のキーで呼び出される", async () => {
    // fetchRecentChanges がエラーをスロー
    spyOn(services, "fetchRecentChanges").mockRejectedValue(new Error("API Error"));

    const { confluenceUpdateNotifyJob } = await import("./confluence-update-notify-job");
    await confluenceUpdateNotifyJob();

    expect(sendSlackExceptionSpy).toHaveBeenCalled();
    const callArgs = sendSlackExceptionSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceUpdateNotifyJob);
  });
});
