import type { JobName } from "~/types";

export interface PageConfig {
  rootPageIds: string[];
  spaceKey: string;
}

/**
 * ジョブごとのConfluenceページ設定（サンプル）
 *
 * 環境別ファイルを作成する際の雛形として使用します:
 * - 開発環境: `confluence-page-configs.dev.ts`
 * - 本番環境: `confluence-page-configs.prod.ts`
 */
export const CONFLUENCE_PAGE_CONFIGS: Record<JobName, PageConfig> = {
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
