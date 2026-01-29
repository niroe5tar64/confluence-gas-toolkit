import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as slackClient from "../../clients/slack-client";
import { sendSlackException, sendSlackMessage } from "./slack-message";

describe("sendSlackMessage", () => {
  let getSlackClientSpy: ReturnType<typeof spyOn>;
  let mockSend: ReturnType<typeof spyOn>;

  beforeEach(() => {
    slackClient.resetSlackClientCache();

    // SlackClient の send メソッドをモック
    mockSend = spyOn({ send: async () => true }, "send").mockResolvedValue(true);
    const mockClient = { send: mockSend } as unknown as slackClient.default;

    getSlackClientSpy = spyOn(slackClient, "getSlackClient").mockReturnValue(mockClient);
  });

  afterEach(() => {
    getSlackClientSpy.mockRestore();
  });

  it("targetKey を指定して getSlackClient を呼び出す", async () => {
    const payload = { text: "test message" };
    await sendSlackMessage(payload, "update-notify");

    expect(getSlackClientSpy).toHaveBeenCalledWith("update-notify");
  });

  it("targetKey を省略すると DEFAULT を使用する", async () => {
    const payload = { text: "test message" };
    await sendSlackMessage(payload);

    expect(getSlackClientSpy).toHaveBeenCalledWith("DEFAULT");
  });
});

describe("sendSlackException", () => {
  let getSlackClientSpy: ReturnType<typeof spyOn>;
  let mockSend: ReturnType<typeof spyOn>;

  beforeEach(() => {
    slackClient.resetSlackClientCache();

    mockSend = spyOn({ send: async () => true }, "send").mockResolvedValue(true);
    const mockClient = { send: mockSend } as unknown as slackClient.default;

    getSlackClientSpy = spyOn(slackClient, "getSlackClient").mockReturnValue(mockClient);
  });

  afterEach(() => {
    getSlackClientSpy.mockRestore();
  });

  it("targetKey を指定して getSlackClient を呼び出す", async () => {
    const error = new Error("test error");
    await sendSlackException(error, "update-summary");

    expect(getSlackClientSpy).toHaveBeenCalledWith("update-summary");
  });

  it("targetKey を省略すると DEFAULT を使用する", async () => {
    const error = new Error("test error");
    await sendSlackException(error);

    expect(getSlackClientSpy).toHaveBeenCalledWith("DEFAULT");
  });
});
