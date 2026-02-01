import { SLACK_ROUTE } from "~/config";
import {
  convertSearchResultToMessagePayload,
  fetchRecentChanges,
  isJobExecutionAllowed,
  parseJobData,
  sendSlackException,
  sendSlackMessage,
  sortSearchResultsByUpdatedAtAsc,
  updateJobData,
} from "~/services";

const TARGET_KEY = SLACK_ROUTE.confluenceCreateNotifyJob;

/**
 * ページ新規作成時の通知ジョブ
 */
export async function confluenceCreateNotifyJob() {
  if (!isJobExecutionAllowed("confluenceCreateNotifyJob")) {
    console.log("'confluenceCreateNotifyJob' は実行可能な時間ではないので、処理を中断しました。");
    return;
  }

  try {
    await executeMainProcess();
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error, TARGET_KEY);
    }
  }
}

async function executeMainProcess() {
  // 前回実行時のタイムスタンプを読み取る（存在しない場合 or 日時が無効な場合は15分前）
  const jobData = parseJobData("confluence-create-notify-job.json");
  const timestampISOString =
    jobData?.timestamp && !Number.isNaN(new Date(jobData.timestamp).getTime())
      ? jobData.timestamp
      : new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // タイムスタンプ以降に更新されたページ一覧を取得
  const recentChangePages = await fetchRecentChanges(
    timestampISOString,
    "confluenceCreateNotifyJob",
  );

  const createdAtThreshold = new Date(timestampISOString);
  const createdPages = recentChangePages.results.filter((result) => {
    const createdAt = result.history?.createdDate;
    if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
      return createdAt.getTime() >= createdAtThreshold.getTime();
    }
    // fallback for responses without history.createdDate
    return result.version?.number === 1;
  });
  const sortedSearchResults = sortSearchResultsByUpdatedAtAsc(createdPages);
  const baseUrl = recentChangePages._links?.base || "";
  for (const result of sortedSearchResults) {
    const payload = convertSearchResultToMessagePayload(
      result,
      baseUrl,
      "confluenceCreateNotifyJob",
    );
    await sendSlackMessage(payload, TARGET_KEY);
  }

  const updatedAtList: Date[] = recentChangePages.results
    .map((result) => result.version?.when)
    .filter((when): when is Date => when !== undefined);
  const latestUpdatedAt =
    updatedAtList.length > 0
      ? new Date(Math.max(...updatedAtList.map((date) => date.getTime())))
      : new Date();

  const updatedJobData = {
    ...(jobData ?? {}),
    timestamp: Number.isNaN(latestUpdatedAt.getTime())
      ? timestampISOString
      : latestUpdatedAt.toISOString(),
  };
  updateJobData(updatedJobData, "confluence-create-notify-job.json");
}
