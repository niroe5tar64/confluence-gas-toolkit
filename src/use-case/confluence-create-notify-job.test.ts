import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { SLACK_ROUTE } from "~/config";
import * as services from "~/services";

describe("confluenceCreateNotifyJob", () => {
  let sendSlackMessageSpy: ReturnType<typeof spyOn>;
  let sendSlackExceptionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    sendSlackMessageSpy = spyOn(services, "sendSlackMessage").mockResolvedValue(undefined);
    sendSlackExceptionSpy = spyOn(services, "sendSlackException").mockResolvedValue(undefined);
  });

  afterEach(() => {
    mock.restore();
  });

  it("sendSlackMessage は SLACK_ROUTE.confluenceCreateNotifyJob のキーで呼び出される", async () => {
    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(sendSlackMessageSpy).toHaveBeenCalled();
    const callArgs = sendSlackMessageSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceCreateNotifyJob);
  });

  it("エラー時に sendSlackException は SLACK_ROUTE.confluenceCreateNotifyJob のキーで呼び出される", async () => {
    // sendSlackMessage がエラーをスロー
    sendSlackMessageSpy.mockRejectedValue(new Error("API Error"));

    const { confluenceCreateNotifyJob } = await import("./confluence-create-notify-job");
    await confluenceCreateNotifyJob();

    expect(sendSlackExceptionSpy).toHaveBeenCalled();
    const callArgs = sendSlackExceptionSpy.mock.calls[0];
    expect(callArgs[1]).toBe(SLACK_ROUTE.confluenceCreateNotifyJob);
  });
});
