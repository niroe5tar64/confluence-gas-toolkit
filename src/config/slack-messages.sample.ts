import type { JobName } from "~/types";

/**
 * ジョブごとのSlackメッセージ設定（サンプル）
 *
 * 環境別ファイルを作成する際の雛形として使用します:
 * - 開発環境: `slack-messages.dev.ts`
 * - 本番環境: `slack-messages.prod.ts`
 */
export const SLACK_MESSAGES: Record<JobName, { headerText: string }> = {
  confluenceUpdateNotifyJob: {
    headerText: "Confluenceページ更新通知",
  },
  confluenceUpdateSummaryJob: {
    headerText: "週次サマリー",
  },
  confluenceCreateNotifyJob: {
    headerText: "Confluenceページ新規作成通知",
  },
};
