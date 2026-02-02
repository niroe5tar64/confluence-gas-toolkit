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
import { createLogger } from "~/utils";

const TARGET_KEY = SLACK_ROUTE.confluenceCreateNotifyJob;
const JOB_NAME = "confluenceCreateNotifyJob";
const logger = createLogger("CreateNotifyJob");

/**
 * ページ新規作成時の通知ジョブ
 */
export async function confluenceCreateNotifyJob() {
  logger.info("ジョブ開始", { jobName: JOB_NAME });

  if (!isJobExecutionAllowed(JOB_NAME)) {
    logger.info("実行時間外のためスキップ", {
      jobName: JOB_NAME,
      currentTime: new Date().toISOString(),
    });
    return;
  }

  try {
    await executeMainProcess();
    logger.info("ジョブ完了", { jobName: JOB_NAME });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("ジョブ失敗", error, { jobName: JOB_NAME });
      await sendSlackException(error, TARGET_KEY, { jobName: JOB_NAME });
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
  logger.debug("前回タイムスタンプ取得", { jobName: JOB_NAME, timestamp: timestampISOString });

  // タイムスタンプ以降に更新されたページ一覧を取得
  const recentChangePages = await fetchRecentChanges(timestampISOString, JOB_NAME);

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
    const payload = convertSearchResultToMessagePayload(result, baseUrl, JOB_NAME);
    await sendSlackMessage(payload, TARGET_KEY);
  }

  if (sortedSearchResults.length === 0) {
    logger.info("変更なし", { jobName: JOB_NAME });
  } else {
    logger.info("変更検出", { jobName: JOB_NAME, count: sortedSearchResults.length });
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
