import { SLACK_ROUTE } from "~/config";
import {
  convertSearchResultsToSummaryPayload,
  fetchAllPages,
  fetchRecentChanges,
  parseJobData,
  sendSlackException,
  sendSlackMessage,
  updateJobData,
} from "~/services";
import type { JobDataForSummaryJob } from "~/types";
import { createLogger } from "~/utils";

const TARGET_KEY = SLACK_ROUTE.confluenceUpdateSummaryJob;
const JOB_NAME = "confluenceUpdateSummaryJob";
const logger = createLogger("UpdateSummaryJob");

export async function confluenceUpdateSummaryJob() {
  logger.info("ジョブ開始", { jobName: JOB_NAME });
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
  const parsedJobData = parseJobData("confluence-summary-job.json");

  // サマリー生成用データが存在しない場合は、初期化プロセスを実行
  if (!parsedJobData || !("originalVersions" in parsedJobData)) {
    await initializeSummaryDataProcess();
    return;
  }
  const jobData = parsedJobData as JobDataForSummaryJob;

  // polingInfo.timestamp更新用に予め現在日時の取得しておく
  const timestamp = new Date().toISOString();

  // 前回実行時のタイムスタンプを読み取る（存在しない場合 or 日時が無効な場合は1週間前）
  const timestampISOString =
    jobData.timestamp && !Number.isNaN(new Date(jobData.timestamp).getTime())
      ? jobData.timestamp
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  logger.debug("前回タイムスタンプ取得", { jobName: JOB_NAME, timestamp: timestampISOString });

  // タイムスタンプ以降に更新されたページ一覧を取得（最大 limit 件まで）
  const recentChangePages = await fetchRecentChanges(timestampISOString, JOB_NAME);

  if (recentChangePages.results.length === 0) {
    logger.info("変更なし", { jobName: JOB_NAME });
    return;
  }

  const payload = convertSearchResultsToSummaryPayload(
    recentChangePages.results,
    jobData.originalVersions,
    recentChangePages._links.base,
  );

  await sendSlackMessage(payload, TARGET_KEY);

  const latestVersions = recentChangePages.results.reduce(
    (acc, result) => {
      acc[result.id] = result.version?.number ?? 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const updatedJobData = {
    timestamp,
    originalVersions: { ...jobData.originalVersions, ...latestVersions },
  };
  updateJobData(updatedJobData, "confluence-summary-job.json");
}

// サマリー生成用データの初期化プロセス
async function initializeSummaryDataProcess() {
  const searchPages = await fetchAllPages(JOB_NAME);
  const pages = searchPages.results.map((result) => ({
    pageId: result.id,
    originalVersion: result.version?.number ?? 1,
  }));
  const jobData: JobDataForSummaryJob = {
    timestamp: new Date().toISOString(),
    originalVersions: pages.reduce(
      (acc, page) => {
        acc[page.pageId] = page.originalVersion;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };
  updateJobData(jobData, "confluence-summary-job.json");
  logger.info("サマリー生成用データを初期化しました。", { jobName: JOB_NAME });
}
