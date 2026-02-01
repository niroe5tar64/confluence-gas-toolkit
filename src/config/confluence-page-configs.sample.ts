import type { JobName } from "~/types";

export interface PageConfig {
  rootPageIds: string[];
  spaceKey: string;
}

/**
 *`confluence-page-configs.sample.ts` を参考に
 * この値を更新してください。
 */
export let CONFLUENCE_PAGE_CONFIGS: Record<JobName, PageConfig> | null = null;

/**
 * テスト用: ページ設定を上書き
 * @internal
 */
export function setConfluencePageConfigsForTest(configs: Record<JobName, PageConfig> | null): void {
  CONFLUENCE_PAGE_CONFIGS = configs;
}

/**
 * `src/config/confluence-page-configs.ts` を作成する際のサンプル。
 */
CONFLUENCE_PAGE_CONFIGS = {
  confluenceUpdateNotifyJob: {
    rootPageIds: ["12345"],
    spaceKey: "SPACE_A",
  },
  confluenceUpdateSummaryJob: {
    rootPageIds: ["23456"],
    spaceKey: "SPACE_B",
  },
  confluenceCreateNotifyJob: {
    rootPageIds: ["34567"],
    spaceKey: "SPACE_C",
  },
};
