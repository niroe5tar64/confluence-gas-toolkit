import { describe, expect, it, mock } from "bun:test";
import type { Confluence } from "~/types";

mock.module("~/utils", () => ({
  formatDateJST: () => "2024/01/15 09:00",
  getEnvVariable: () => undefined,
  toQueryString: (params: Record<string, string>) =>
    Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join("&"),
}));

const { convertSearchResultsToSummaryPayload } = await import("./summary-payload");

describe("convertSearchResultsToSummaryPayload", () => {
  it("should use revisedVersion in diff URL", () => {
    const searchResults: Confluence.SearchResult[] = [
      {
        id: "123",
        title: "テストページ",
        type: "page",
        version: {
          by: { displayName: "テストユーザー" },
          when: new Date("2024-01-15T00:00:00Z"),
          number: 3,
        },
      },
    ];

    const payload = convertSearchResultsToSummaryPayload(searchResults, { "123": 1 }, "https://example.atlassian.net/wiki");
    const payloadText = JSON.stringify(payload);

    expect(payloadText).toContain("originalVersion=1");
    expect(payloadText).toContain("revisedVersion=3");
    expect(payloadText).not.toContain("currentVersion=");
  });
});
