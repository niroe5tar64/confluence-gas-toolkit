import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as utils from "~/utils";
import { CONFLUENCE_PAGE_CONFIGS as SAMPLE_PAGE_CONFIGS } from "../config/confluence-page-configs.sample";

// 必要なエクスポートを個別にインポート
import { IO_CONFIG } from "../config/io-config";
import { jobExecutionPolicy } from "../config/job-schedule";
import {
  isPageConfig,
  isPageConfigRecord,
  validatePageConfigs,
} from "../config/page-config-validator";
import { SLACK_MESSAGES } from "../config/slack-messages";
import { SLACK_ROUTE } from "../config/slack-routes";

// ~/config モジュールをモック（サンプル設定を使用）
mock.module("~/config", () => ({
  CONFLUENCE_PAGE_CONFIGS: SAMPLE_PAGE_CONFIGS,
  IO_CONFIG,
  jobExecutionPolicy,
  isPageConfig,
  isPageConfigRecord,
  validatePageConfigs,
  SLACK_MESSAGES,
  SLACK_ROUTE,
}));

// モック後にインポート
const { getConfluenceClient, resetConfluenceClientCache } = await import("./confluence-client");
const ConfluenceClient = (await import("./confluence-client")).default;

describe("getConfluenceClient", () => {
  let getEnvVariableSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    resetConfluenceClientCache();
    getEnvVariableSpy = spyOn(utils, "getEnvVariable");
  });

  afterEach(() => {
    getEnvVariableSpy.mockRestore();
    resetConfluenceClientCache();
  });

  describe("CONFLUENCE_PAGE_CONFIGS が設定されている場合", () => {
    it("指定されたジョブ名に対応する ConfluenceClient を返す", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("同じジョブ名で呼び出すと同じインスタンスを返す（キャッシュ）", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client1).toBe(client2);
    });

    it("異なるジョブ名で呼び出すと異なるインスタンスを返す", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateSummaryJob");
      expect(client1).not.toBe(client2);
    });
  });

  describe("エラーハンドリング", () => {
    it("CONFLUENCE_URL が設定されていない場合はエラーをスロー", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        // CONFLUENCE_URL がない
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "必須環境変数が未設定です: CONFLUENCE_URL",
      );
    });

    it("CONFLUENCE_PAT が設定されていない場合はエラーをスロー", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        // CONFLUENCE_PAT がない
        return "";
      });

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "必須環境変数が未設定です: CONFLUENCE_PAT",
      );
    });
  });

  // 注意: CONFLUENCE_PAGE_CONFIGS の検証テストは page-config-validator.test.ts に移動済み

  describe("廃止されたAPI", () => {
    it("getInstance() は削除されている", () => {
      expect("getInstance" in ConfluenceClient).toBe(false);
    });
  });

  describe("ConfluenceClient.getSearchPage", () => {
    it("rootPageIds が空の場合は空の結果を返す", async () => {
      const client = new (
        ConfluenceClient as unknown as {
          new (
            baseUrl: string,
            token: string,
            spaceKey: string,
            rootPageId: string,
            rootPageIds?: string[],
          ): InstanceType<typeof ConfluenceClient>;
        }
      )("https://confluence.example.com", "token", "SPACE", "root", []);

      const callApiSpy = spyOn(
        client as unknown as { callApi: (typeof client)["callApi"] },
        "callApi",
      ).mockResolvedValue({ results: [{ id: "should-not-be-called" }] } as unknown);

      const result = await client.getSearchPage({});

      expect(callApiSpy).not.toHaveBeenCalled();
      expect(result.results).toEqual([]);
      expect(result._links).toEqual({});
    });
  });
});
