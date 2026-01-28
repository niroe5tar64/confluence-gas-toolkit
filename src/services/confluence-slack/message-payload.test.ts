import { describe, it, expect, beforeAll, mock } from "bun:test";
import type { Confluence } from "~/types";

// 環境変数のモック
mock.module("~/utils", () => ({
  formatDateJST: (date?: string | Date) => {
    if (!date) return "2024/01/15 12:00";
    return "2024/01/15 09:00";
  },
  getEnvVariable: (key: string) => {
    if (key === "SLACK_HEADER_TEXT") return "テスト通知";
    return undefined;
  },
  toQueryString: (params: Record<string, string>) =>
    Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&"),
}));

// モック後にインポート
const { convertSearchResultToMessagePayload } = await import("./message-payload");

describe("convertSearchResultToMessagePayload", () => {
  const baseUrl = "https://confluence.example.com";

  describe("基本的なペイロード生成", () => {
    it("should create a message payload with version info", () => {
      const searchResult: Confluence.SearchResult = {
        id: "123456",
        title: "テストページ",
        type: "page",
        version: {
          by: { displayName: "山田太郎" },
          when: new Date("2024-01-15T00:00:00Z"),
          number: 5,
        },
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      expect(result.blocks).toBeDefined();
      expect(result.blocks).toHaveLength(2);

      // ヘッダーブロックの確認
      const headerBlock = result.blocks![0] as { type: string; text: { text: string } };
      expect(headerBlock.type).toBe("header");
      expect(headerBlock.text.text).toBe("テスト通知");

      // セクションブロックの確認
      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      expect(sectionBlock.type).toBe("section");
      expect(sectionBlock.fields).toHaveLength(2);

      // ページリンクに diff リンクが含まれる（バージョン > 1）
      expect(sectionBlock.fields[0].text).toContain("テストページ");
      expect(sectionBlock.fields[0].text).toContain("diff");
      expect(sectionBlock.fields[0].text).toContain("pageId=123456");

      // 更新者と更新日時
      expect(sectionBlock.fields[1].text).toContain("山田太郎");
    });

    it("should create a message payload without diff link for version 1", () => {
      const searchResult: Confluence.SearchResult = {
        id: "123456",
        title: "新規ページ",
        type: "page",
        version: {
          by: { displayName: "佐藤花子" },
          when: new Date("2024-01-15T00:00:00Z"),
          number: 1, // 初回バージョン
        },
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      // バージョン1なので diff リンクは含まれない
      expect(sectionBlock.fields[0].text).not.toContain("diff");
      expect(sectionBlock.fields[0].text).toContain("新規ページ");
    });
  });

  describe("バージョン情報がない場合", () => {
    it("should handle missing version", () => {
      const searchResult: Confluence.SearchResult = {
        id: "123456",
        title: "バージョンなしページ",
        type: "page",
        // version なし
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      // 更新者と更新日時が「不明」
      expect(sectionBlock.fields[1].text).toContain("不明");
    });

    it("should not include diff link when version is undefined", () => {
      const searchResult: Confluence.SearchResult = {
        id: "789",
        title: "テスト",
        type: "page",
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      expect(sectionBlock.fields[0].text).not.toContain("diff");
    });
  });

  describe("URL生成", () => {
    it("should generate correct page URL", () => {
      const searchResult: Confluence.SearchResult = {
        id: "99999",
        title: "URLテスト",
        type: "page",
        version: {
          by: { displayName: "テスト" },
          when: new Date(),
          number: 2,
        },
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      expect(sectionBlock.fields[0].text).toContain(
        `${baseUrl}/pages/viewpage.action?pageId=99999`,
      );
    });

    it("should generate correct diff URL with version numbers", () => {
      const searchResult: Confluence.SearchResult = {
        id: "12345",
        title: "Diffテスト",
        type: "page",
        version: {
          by: { displayName: "テスト" },
          when: new Date(),
          number: 10, // バージョン10
        },
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      // diff URL には originalVersion=9 と revisedVersion=10 が含まれる
      expect(sectionBlock.fields[0].text).toContain("originalVersion=9");
      expect(sectionBlock.fields[0].text).toContain("revisedVersion=10");
    });
  });

  describe("特殊文字を含むタイトル", () => {
    it("should handle title with special characters", () => {
      const searchResult: Confluence.SearchResult = {
        id: "123",
        title: "テスト<>&\"'ページ",
        type: "page",
        version: {
          by: { displayName: "テスト" },
          when: new Date(),
          number: 2,
        },
      };

      const result = convertSearchResultToMessagePayload(searchResult, baseUrl);

      const sectionBlock = result.blocks![1] as { type: string; fields: { text: string }[] };
      expect(sectionBlock.fields[0].text).toContain("テスト<>&\"'ページ");
    });
  });
});
