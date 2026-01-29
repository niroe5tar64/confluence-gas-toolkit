import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import * as utils from "~/utils";
import { getConfluenceClient, resetConfluenceClientCache } from "./confluence-client";

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
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("複数ページが指定されている場合、すべてのページに対応する", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123", "456"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["012"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("同じジョブ名で呼び出すと同じインスタンスを返す（キャッシュ）", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client1).toBe(client2);
    });

    it("異なるジョブ名で呼び出すと異なるインスタンスを返す", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateSummaryJob");
      expect(client1).not.toBe(client2);
    });
  });

  describe("後方互換性: 古い環境変数へのフォールバック", () => {
    it("CONFLUENCE_PAGE_CONFIGS が未設定で ROOT_PAGE_ID がある場合、それを使用", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "ROOT_PAGE_ID") return "legacy-page-id";
        if (key === "SPACE_KEY") return "LEGACY_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("すべてのジョブが同じ設定を使用する場合", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "ROOT_PAGE_ID") return "legacy-page-id";
        if (key === "SPACE_KEY") return "LEGACY_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateSummaryJob");
      const client3 = getConfluenceClient("confluenceCreateNotifyJob");

      // すべてのクライアントが定義されている（同じ設定から生成）
      expect(client1).toBeDefined();
      expect(client2).toBeDefined();
      expect(client3).toBeDefined();
    });
  });

  describe("エラーハンドリング", () => {
    it("CONFLUENCE_URL が設定されていない場合はエラーをスロー", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        // CONFLUENCE_URL がない
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "環境変数が正しく設定されていません。",
      );
    });

    it("CONFLUENCE_PAT が設定されていない場合はエラーをスロー", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        // CONFLUENCE_PAT がない
        return "";
      });

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "環境変数が正しく設定されていません。",
      );
    });

    it("JSON パースに失敗した場合は後方互換性で処理", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return "invalid json {";
        if (key === "ROOT_PAGE_ID") return "fallback-page-id";
        if (key === "SPACE_KEY") return "FALLBACK_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });
  });

  describe("型検証", () => {
    it("rootPageIds が配列でない場合は後方互換性で処理", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: "not-an-array", // 配列でない
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "ROOT_PAGE_ID") return "fallback-page-id";
        if (key === "SPACE_KEY") return "FALLBACK_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      // 型検証に失敗するため、後方互換性で処理される
      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("spaceKey がない場合は後方互換性で処理", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          // spaceKey がない
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "ROOT_PAGE_ID") return "fallback-page-id";
        if (key === "SPACE_KEY") return "FALLBACK_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      // 型検証に失敗するため、後方互換性で処理される
      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("ジョブ名が不足している場合は後方互換性で処理", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        // confluenceUpdateSummaryJob と confluenceCreateNotifyJob がない
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "ROOT_PAGE_ID") return "fallback-page-id";
        if (key === "SPACE_KEY") return "FALLBACK_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      // 型検証に失敗するため、後方互換性で処理される
      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("rootPageIds に文字列以外が含まれている場合は後方互換性で処理", () => {
      const pageConfigs = JSON.stringify({
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123", 456], // 数値が含まれている
          spaceKey: "SPACE_A",
        },
        confluenceUpdateSummaryJob: {
          rootPageIds: ["456"],
          spaceKey: "SPACE_B",
        },
        confluenceCreateNotifyJob: {
          rootPageIds: ["789"],
          spaceKey: "SPACE_C",
        },
      });

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_PAGE_CONFIGS") return pageConfigs;
        if (key === "ROOT_PAGE_ID") return "fallback-page-id";
        if (key === "SPACE_KEY") return "FALLBACK_SPACE";
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      // 型検証に失敗するため、後方互換性で処理される
      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });
  });
});
