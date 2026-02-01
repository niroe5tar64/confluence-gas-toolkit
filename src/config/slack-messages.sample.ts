import type { JobName } from "~/types";

/**
 * ジョブごとのSlackメッセージ設定（サンプル）
 *
 * `src/config/slack-messages.ts` を作成する際の雛形として使用します。
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
