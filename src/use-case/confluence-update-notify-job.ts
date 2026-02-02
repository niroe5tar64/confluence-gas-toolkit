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

const TARGET_KEY = SLACK_ROUTE.confluenceUpdateNotifyJob;
const JOB_NAME = "confluenceUpdateNotifyJob";
const logger = createLogger("UpdateNotifyJob");

/**
 * 定期実行される通知ジョブのメイン処理を実行します。
 *
 * この関数は、Confluence API から最近の変更を取得し、
 * それに基づいて Slack に通知メッセージを送信します。
 *
 * @returns {Promise<void>} 処理が完了したら解決される Promise
 */
export async function confluenceUpdateNotifyJob() {
  logger.info("ジョブ開始", { jobName: JOB_NAME });

  // 実行可能な時間帯でない場合は、処理を中断します。
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
  const jobData = parseJobData("confluence-update-notify-job.json");
  const timestampISOString =
    jobData?.timestamp && !Number.isNaN(new Date(jobData?.timestamp).getTime())
      ? jobData?.timestamp
      : new Date(Date.now() - 15 * 60 * 1000).toISOString();
  logger.debug("前回タイムスタンプ取得", { jobName: JOB_NAME, timestamp: timestampISOString });

  // タイムスタンプ以降に更新されたページ一覧を取得
  const recentChangePages = await fetchRecentChanges(timestampISOString, JOB_NAME);

  // Confluence API から取得した検索結果を時系列順に並べ替え、
  // 各結果を Slack メッセージのペイロードに変換して順次送信します。
  // 逐次送信により、Slack チャンネル上での表示順序を保証します。
  const sortedSearchResults = sortSearchResultsByUpdatedAtAsc(recentChangePages.results);
  const baseUrl = recentChangePages._links?.base || "";
  for (const result of sortedSearchResults) {
    const payload = convertSearchResultToMessagePayload(
      result,
      baseUrl,
      "confluenceUpdateNotifyJob",
    );
    await sendSlackMessage(payload, TARGET_KEY);
  }

  if (sortedSearchResults.length === 0) {
    logger.info("変更なし", { jobName: JOB_NAME });
  } else {
    logger.info("変更検出", { jobName: JOB_NAME, count: sortedSearchResults.length });
  }

  // 最も最近の更新日時を特定し次回以降の差分取得に備えてタイムスタンプを保存する
  const updatedAtList: Date[] = recentChangePages.results
    .map((result) => result.version)
    .map((version) => version?.when)
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
  updateJobData(updatedJobData, "confluence-update-notify-job.json");
}
