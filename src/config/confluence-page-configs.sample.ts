import type { JobName } from "~/types";

export interface PageConfig {
  rootPageIds: string[];
  spaceKey: string;
}

/**
 * テスト用: ページ設定を上書き
 * @internal
 */
export let CONFLUENCE_PAGE_CONFIGS: Record<JobName, PageConfig> | null = null;

export function setConfluencePageConfigsForTest(
  configs: Record<JobName, PageConfig> | null,
): void {
  CONFLUENCE_PAGE_CONFIGS = configs;
}

/**
 * ジョブごとのConfluenceページ設定（サンプル）
 *
 * 環境別ファイルを作成する際の雛形として使用します:
 * - 開発環境: `confluence-page-configs.dev.ts`
 * - 本番環境: `confluence-page-configs.prod.ts`
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
