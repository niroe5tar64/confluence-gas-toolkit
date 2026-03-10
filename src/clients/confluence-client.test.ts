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

import HttpClient from "./http-client";

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
            tokenProvider?: () => string,
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

  describe("callApi リトライ（社内API利用ルール）", () => {
    let sleepSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      sleepSpy = spyOn(utils, "sleep").mockResolvedValue(undefined);
    });

    afterEach(() => {
      sleepSpy.mockRestore();
    });

    it("503 のとき10秒待機して1回リトライし、2回目で成功する", async () => {
      const client = new ConfluenceClient(
        "https://confluence.example.com",
        "token",
        "SPACE",
        "root",
        ["root"],
      );
      const mockResponse = (status: number, body: unknown) =>
        Promise.resolve({
          status,
          json: () => Promise.resolve(body),
        });
      let callCount = 0;
      spyOn(client as unknown as { httpRequest: HttpClient["httpRequest"] }, "httpRequest").mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) return mockResponse(503, {});
        return mockResponse(200, { data: "ok" });
      });

      const result = await client.callApi<{ data: string }>("GET", "/test");

      expect(result).toEqual({ data: "ok" });
      expect(callCount).toBe(2);
      expect(sleepSpy).toHaveBeenCalledTimes(1);
      expect(sleepSpy).toHaveBeenCalledWith(10_000);
    });

    it("503 が2回連続の場合はリトライ後に throw する", async () => {
      const client = new ConfluenceClient(
        "https://confluence.example.com",
        "token",
        "SPACE",
        "root",
        ["root"],
      );
      const mock503 = () =>
        Promise.resolve({
          status: 503,
          json: () => Promise.resolve({}),
        });
      spyOn(client as unknown as { httpRequest: HttpClient["httpRequest"] }, "httpRequest").mockImplementation(() => mock503());

      await expect(client.callApi("GET", "/test")).rejects.toThrow("HTTP Error: 503");
      expect(sleepSpy).toHaveBeenCalledTimes(1);
    });

    it("401 のとき tokenProvider でトークン再取得して1回リトライし、2回目で成功する", async () => {
      let tokenProviderCalls = 0;
      const tokenProvider = () => {
        tokenProviderCalls += 1;
        return "new-token";
      };
      const client = new ConfluenceClient(
        "https://confluence.example.com",
        "old-token",
        "SPACE",
        "root",
        ["root"],
        tokenProvider,
      );
      let callCount = 0;
      spyOn(client as unknown as { httpRequest: HttpClient["httpRequest"] }, "httpRequest").mockImplementation((_url, opts) => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve({ status: 401, json: () => Promise.resolve({}) });
        }
        expect(opts?.headers?.Authorization).toBe("Bearer new-token");
        return Promise.resolve({ status: 200, json: () => Promise.resolve({ data: "ok" }) });
      });

      const result = await client.callApi<{ data: string }>("GET", "/test");

      expect(result).toEqual({ data: "ok" });
      expect(callCount).toBe(2);
      expect(tokenProviderCalls).toBe(1);
    });

    it("401 が2回連続の場合はリトライしないで throw する", async () => {
      let tokenProviderCalls = 0;
      const tokenProvider = () => {
        tokenProviderCalls += 1;
        return "new-token";
      };
      const client = new ConfluenceClient(
        "https://confluence.example.com",
        "token",
        "SPACE",
        "root",
        ["root"],
        tokenProvider,
      );
      const mock401 = () =>
        Promise.resolve({
          status: 401,
          json: () => Promise.resolve({}),
        });
      spyOn(client as unknown as { httpRequest: HttpClient["httpRequest"] }, "httpRequest").mockImplementation(() => mock401());

      await expect(client.callApi("GET", "/test")).rejects.toThrow("HTTP Error: 401");
      expect(tokenProviderCalls).toBe(1);
    });

    it("tokenProvider 未設定で 401 の場合はリトライせず即 throw する", async () => {
      const client = new ConfluenceClient(
        "https://confluence.example.com",
        "token",
        "SPACE",
        "root",
        ["root"],
        undefined,
      );
      spyOn(client as unknown as { httpRequest: HttpClient["httpRequest"] }, "httpRequest").mockResolvedValue({
        status: 401,
        json: () => Promise.resolve({}),
      });

      await expect(client.callApi("GET", "/test")).rejects.toThrow("HTTP Error: 401");
      expect(sleepSpy).not.toHaveBeenCalled();
    });
  });
});
