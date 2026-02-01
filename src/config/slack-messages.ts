import type { JobName } from "~/types";

/**
 * ジョブごとのSlackメッセージ設定
 *
 * 各ジョブに対して、Slackメッセージのヘッダーテキストなどを設定します。
 * JobNameに新しいジョブを追加した場合、ここに設定しないとコンパイルエラーになります。
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
