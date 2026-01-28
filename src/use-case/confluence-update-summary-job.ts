import {
  convertSearchResultsToSummaryPayload,
  fetchAllPages,
  fetchRecentChanges,
  parseJobData,
  sendSlackException,
  sendSlackMessage,
  updateJobData,
} from "~/services";
import { JobDataForSummaryJob } from "~/types";

export async function confluenceUpdateSummaryJob() {
  try {
    await executeMainProcess();
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error);
    }
  }
}

async function executeMainProcess() {
  const parsedJobData = parseJobData("confluence-summary-job.json");

  // サマリー生成用データが存在しない場合は、初期化プロセスを実行
  if (!parsedJobData || !("originalVersions" in parsedJobData)) {
    initializeSummaryDataProcess();
    return;
  }
  const jobData = parsedJobData as JobDataForSummaryJob;

  // polingInfo.timestamp更新用に予め現在日時の取得しておく
  const timestamp = new Date().toISOString();

  // 前回実行時のタイムスタンプを読み取る（存在しない場合 or 日時が無効な場合は1週間前）
  const timestampISOString =
    jobData.timestamp && !Number.isNaN(new Date(jobData.timestamp))
      ? jobData.timestamp
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // タイムスタンプ以降に更新されたページ一覧を取得（最大 limit 件まで）
  const recentChangePages = await fetchRecentChanges(timestampISOString);

  if (recentChangePages.results.length === 0) {
    console.log("最近の変更はありません。");
    return;
  }

  const payload = convertSearchResultsToSummaryPayload(
    recentChangePages.results,
    jobData.originalVersions,
    recentChangePages._links.base,
  );

  await sendSlackMessage(payload);

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
  const searchPages = await fetchAllPages();
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
  console.log("サマリー生成用データを初期化しました。");
}
