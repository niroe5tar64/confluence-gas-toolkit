import type { JobName } from "~/types";

/**
 * ジョブ名 → Slack送信先キーのマッピング
 * JobName に新しいジョブを追加した場合、ここに設定しないとコンパイルエラーになる
 */
export const SLACK_ROUTE: Record<JobName, string> = {
  confluenceUpdateNotifyJob: "update-notify",
  confluenceUpdateSummaryJob: "update-summary",
};
