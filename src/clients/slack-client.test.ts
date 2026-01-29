import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as utils from "~/utils";
import { getSlackClient, resetSlackClientCache } from "./slack-client";

describe("getSlackClient", () => {
  let getEnvVariableSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    resetSlackClientCache();
    getEnvVariableSpy = spyOn(utils, "getEnvVariable");
  });

  afterEach(() => {
    getEnvVariableSpy.mockRestore();
  });

  describe("SLACK_WEBHOOK_URLS が設定されている場合", () => {
    it("指定されたキーに対応する SlackClient を返す", () => {
      const webhookUrls = JSON.stringify({
        "update-notify": "https://hooks.slack.com/services/AAA",
        "update-summary": "https://hooks.slack.com/services/BBB",
      });
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "SLACK_WEBHOOK_URLS") return webhookUrls;
        return "";
      });

      const client = getSlackClient("update-notify");
      expect(client).toBeDefined();
    });

    it("存在しないキーを指定するとエラーをスロー", () => {
      const webhookUrls = JSON.stringify({
        "update-notify": "https://hooks.slack.com/services/AAA",
      });
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "SLACK_WEBHOOK_URLS") return webhookUrls;
        return "";
      });

      expect(() => getSlackClient("non-existent-key")).toThrow(
        "Webhook URL が見つかりません: non-existent-key",
      );
    });

    it("同じキーで呼び出すと同じインスタンスを返す（キャッシュ）", () => {
      const webhookUrls = JSON.stringify({
        "update-notify": "https://hooks.slack.com/services/AAA",
      });
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "SLACK_WEBHOOK_URLS") return webhookUrls;
        return "";
      });

      const client1 = getSlackClient("update-notify");
      const client2 = getSlackClient("update-notify");
      expect(client1).toBe(client2);
    });
  });

  describe("後方互換性: SLACK_WEBHOOK_URL へのフォールバック", () => {
    it("SLACK_WEBHOOK_URLS が未設定で SLACK_WEBHOOK_URL がある場合、DEFAULT キーとして扱う", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "SLACK_WEBHOOK_URL") return "https://hooks.slack.com/services/LEGACY";
        return "";
      });

      const client = getSlackClient("DEFAULT");
      expect(client).toBeDefined();
    });

    it("両方の環境変数が未設定の場合はエラーをスロー", () => {
      getEnvVariableSpy.mockReturnValue("");

      expect(() => getSlackClient("any-key")).toThrow("SLACK_WEBHOOK_URLS が設定されていません");
    });
  });
});
