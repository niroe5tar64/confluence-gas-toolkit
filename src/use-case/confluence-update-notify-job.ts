import {
  fetchRecentChanges,
  isJobExecutionAllowed,
  sendSlackMessage,
  parseJobData,
  updateJobData,
  sortSearchResultsByUpdatedAtAsc,
  convertSearchResultToMessagePayload,
  sendSlackException,
} from "~/services";
import { Confluence } from "~/types";

/**
 * 定期実行される通知ジョブのメイン処理を実行します。
 *
 * この関数は、Confluence API から最近の変更を取得し、
 * それに基づいて Slack に通知メッセージを送信します。
 *
 * @returns {Promise<void>} 処理が完了したら解決される Promise
 */
export async function confluenceUpdateNotifyJob() {
  // 実行可能な時間帯でない場合は、処理を中断します。
  if (!isJobExecutionAllowed("confluenceUpdateNotifyJob")) {
    console.log("'confluenceUpdateNotifyJob' は実行可能な時間ではないので、処理を中断しました。");
    return;
  }

  try {
    await executeMainProcess();
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error);
    }
  }
}

async function executeMainProcess() {
  // 前回実行時のタイムスタンプを読み取る（存在しない場合 or 日時が無効な場合は15分前）
  const jobData = parseJobData("confluence-update-notify-job.json");
  const timestampISOString =
    jobData?.timestamp && !Number.isNaN(new Date(jobData?.timestamp))
      ? jobData?.timestamp
      : new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // タイムスタンプ以降に更新されたページ一覧を取得（最大 limit 件まで）
  const recentChangePages = await fetchRecentChanges(timestampISOString);

  // Confluence API から取得した検索結果を時系列順に並べ替え、
  // 各結果を Slack メッセージのペイロードに変換して送信します。
  const sortedSearchResults = sortSearchResultsByUpdatedAtAsc(recentChangePages.results);
  sortedSearchResults.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayload(result, recentChangePages._links.base);
    await sendSlackMessage(payload);
  });

  // 最も最近の更新日時を特定し次回以降の差分取得に備えてタイムスタンプを保存する
  const updatedAtList: Date[] = recentChangePages.results
    .map((result) => result.version)
    .map((version) => version?.when)
    .filter((when) => when !== undefined);
  const latestUpdatedAt = new Date(Math.max(...updatedAtList.map((date) => date.getTime())));

  const updatedJobData = {
    ...(jobData ?? {}),
    timestamp: Number.isNaN(latestUpdatedAt.getTime())
      ? timestampISOString
      : latestUpdatedAt.toISOString(),
  };
  updateJobData(updatedJobData, "confluence-update-notify-job.json");
}
