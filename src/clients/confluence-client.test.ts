import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { setConfluencePageConfigsForTest } from "~/config";
import * as utils from "~/utils";
import ConfluenceClient, {
  getConfluenceClient,
  resetConfluenceClientCache,
} from "./confluence-client";

describe("getConfluenceClient", () => {
  let getEnvVariableSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    resetConfluenceClientCache();
    getEnvVariableSpy = spyOn(utils, "getEnvVariable");
    setConfluencePageConfigsForTest(null);
  });

  afterEach(() => {
    getEnvVariableSpy.mockRestore();
    setConfluencePageConfigsForTest(null);
    resetConfluenceClientCache();
  });

  describe("CONFLUENCE_PAGE_CONFIGS が設定されている場合", () => {
    it("指定されたジョブ名に対応する ConfluenceClient を返す", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("複数ページが指定されている場合、すべてのページに対応する", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      const client = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client).toBeDefined();
    });

    it("同じジョブ名で呼び出すと同じインスタンスを返す（キャッシュ）", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateNotifyJob");
      expect(client1).toBe(client2);
    });

    it("異なるジョブ名で呼び出すと異なるインスタンスを返す", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      const client1 = getConfluenceClient("confluenceUpdateNotifyJob");
      const client2 = getConfluenceClient("confluenceUpdateSummaryJob");
      expect(client1).not.toBe(client2);
    });
  });

  describe("エラーハンドリング", () => {
    it("CONFLUENCE_URL が設定されていない場合はエラーをスロー", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        // CONFLUENCE_URL がない
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "必須環境変数が未設定です: CONFLUENCE_URL",
      );
    });

    it("CONFLUENCE_PAT が設定されていない場合はエラーをスロー", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        // CONFLUENCE_PAT がない
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "必須環境変数が未設定です: CONFLUENCE_PAT",
      );
    });

    it("CONFLUENCE_PAGE_CONFIGS が未設定の場合はエラーをスロー", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS が未設定です",
      );
    });

    it("CONFLUENCE_PAGE_CONFIGS が不正な場合はエラーをスロー", () => {
      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest({ invalid: "format" } as never);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
      );
    });
  });

  describe("型検証", () => {
    it("rootPageIds が配列でない場合はエラーをスロー", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs as never);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
      );
    });

    it("spaceKey がない場合はエラーをスロー", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs as never);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
      );
    });

    it("ジョブ名が不足している場合はエラーをスロー", () => {
      const pageConfigs = {
        confluenceUpdateNotifyJob: {
          rootPageIds: ["123"],
          spaceKey: "SPACE_A",
        },
        // confluenceUpdateSummaryJob と confluenceCreateNotifyJob がない
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs as never);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
      );
    });

    it("rootPageIds に文字列以外が含まれている場合はエラーをスロー", () => {
      const pageConfigs = {
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
      };

      getEnvVariableSpy.mockImplementation((key: string) => {
        if (key === "CONFLUENCE_URL") return "https://confluence.example.com";
        if (key === "CONFLUENCE_PAT") return "test-token";
        return "";
      });
      setConfluencePageConfigsForTest(pageConfigs as never);

      expect(() => getConfluenceClient("confluenceUpdateNotifyJob")).toThrow(
        "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
      );
    });
  });

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
          ): ConfluenceClient;
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
