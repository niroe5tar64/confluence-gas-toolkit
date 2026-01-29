import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { SLACK_ROUTE } from "~/config";
import * as services from "~/services";

describe("confluenceCreateNotifyJob", () => {
  let sendSlackMessageSpy: ReturnType<typeof spyOn>;
  let sendSlackExceptionSpy: ReturnType<typeof spyOn>;
  let updateJobDataSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    spyOn(services, "isJobExecutionAllowed").mockReturnValue(true);
    spyOn(services, "parseJobData").mockReturnValue({ timestamp: new Date().toISOString() });
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [],
      _links: { base: "https://confluence.example.com" },
    });
    spyOn(services, "sortSearchResultsByUpdatedAtAsc").mockImplementation((results) => results);
    updateJobDataSpy = spyOn(services, "updateJobData").mockImplementation(() => {});
    spyOn(services, "convertSearchResultToMessagePayload").mockReturnValue({
      text: "test",
      blocks: [],
    });
    sendSlackMessageSpy = spyOn(services, "sendSlackMessage").mockResolvedValue(undefined);
    sendSlackExceptionSpy = spyOn(services, "sendSlackException").mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  it("実行可能時間外の場合は処理をスキップする", async () => {
    spyOn(services, "isJobExecutionAllowed").mockReturnValue(false);
    const fetchRecentChangesSpy = spyOn(services, "fetchRecentChanges");

    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(fetchRecentChangesSpy).not.toHaveBeenCalled();
    expect(sendSlackMessageSpy).not.toHaveBeenCalled();
  });

  it("sendSlackMessage は SLACK_ROUTE.confluenceCreateNotifyJob のキーで呼び出される", async () => {
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [
        {
          id: "123",
          type: "page",
          title: "New Page",
          version: { when: new Date(), number: 1, by: { displayName: "Test User" } },
          _links: { webui: "/pages/123" },
        },
      ],
      _links: { base: "https://confluence.example.com" },
    });
    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(sendSlackMessageSpy).toHaveBeenCalled();
    const callArgs = sendSlackMessageSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceCreateNotifyJob);
  });

  it("新規作成ページ（version=1）のみ通知する", async () => {
    const fetchRecentChangesSpy = spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [
        {
          id: "1",
          type: "page",
          title: "Created Page",
          version: { when: new Date(), number: 1, by: { displayName: "User A" } },
          _links: { webui: "/pages/1" },
        },
        {
          id: "2",
          type: "page",
          title: "Updated Page",
          version: { when: new Date(), number: 2, by: { displayName: "User B" } },
          _links: { webui: "/pages/2" },
        },
      ],
      _links: { base: "https://confluence.example.com" },
    });

    const convertSpy = spyOn(services, "convertSearchResultToMessagePayload").mockReturnValue({
      text: "test",
      blocks: [],
    });

    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(fetchRecentChangesSpy).toHaveBeenCalled();
    expect(convertSpy).toHaveBeenCalledTimes(1);
    const convertArgs = convertSpy.mock.calls[0];
    expect((convertArgs[0] as { id: string }).id).toBe("1");
    expect(sendSlackMessageSpy).toHaveBeenCalledTimes(1);
  });

  it("無効なタイムスタンプの場合はフォールバックした日時で検索する", async () => {
    spyOn(services, "parseJobData").mockReturnValue({ timestamp: "invalid" });
    const fetchRecentChangesSpy = spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [],
      _links: { base: "https://confluence.example.com" },
    });

    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    const callArgs = fetchRecentChangesSpy.mock.calls[0];
    const timestampISOString = callArgs[0] as string;
    expect(Number.isNaN(new Date(timestampISOString).getTime())).toBe(false);
  });

  it("ジョブデータを更新する", async () => {
    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(updateJobDataSpy).toHaveBeenCalled();
    const callArgs = updateJobDataSpy.mock.calls[0];
    const updatedData = callArgs[0] as { timestamp: string };
    expect(Number.isNaN(new Date(updatedData.timestamp).getTime())).toBe(false);
    expect(callArgs[1]).toBe("confluence-create-notify-job.json");
  });

  it("エラー時に sendSlackException は SLACK_ROUTE.confluenceCreateNotifyJob のキーで呼び出される", async () => {
    // sendSlackMessage がエラーをスロー
    sendSlackMessageSpy.mockRejectedValue(new Error("API Error"));
    spyOn(services, "fetchRecentChanges").mockResolvedValue({
      results: [
        {
          id: "999",
          type: "page",
          title: "New Page",
          version: { when: new Date(), number: 1, by: { displayName: "Test User" } },
          _links: { webui: "/pages/999" },
        },
      ],
      _links: { base: "https://confluence.example.com" },
    });

    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(sendSlackExceptionSpy).toHaveBeenCalled();
    const callArgs = sendSlackExceptionSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceCreateNotifyJob);
  });
});
