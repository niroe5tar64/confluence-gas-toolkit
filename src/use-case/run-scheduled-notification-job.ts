import {
  fetchRecentChangesService,
  sendSlackMessageService,
  parsePollingInfoService,
  updatePollingInfoService,
  convertSearchResultToMessagePayload,
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
export async function runScheduledNotificationJob() {
  const pollingInfo = parsePollingInfoService();
  const recentChangePages = await fetchRecentChangesService(pollingInfo?.timestamp);

  const baseUrl = recentChangePages._links.base;
  recentChangePages.results.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayload(result, baseUrl);
    await sendSlackMessageService(payload);
  });
  updatePollingInfoService();
}
