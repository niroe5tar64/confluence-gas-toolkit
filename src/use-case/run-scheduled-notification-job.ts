import {
  fetchConfluenceApiService,
  fetchRecentChangesService,
  sendSlackMessageService,
  parsePollingInfoService,
  updatePollingInfoService,
  convertSearchResultToMessagePayloadService,
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
  // 引数指定した日時以降に更新されたページ一覧を取得
  const recentChangePages = await fetchRecentChangesService(pollingInfo?.timestamp);
  let { results: searchResults, _links: links } = recentChangePages;

  // 一度に取得できない場合は、ループして取得
  let nextEndpoint = links.next;
  while (nextEndpoint) {
    const nextPages = await fetchConfluenceApiService<Confluence.SearchPage>(nextEndpoint);
    searchResults = [...searchResults, ...nextPages.results];
    nextEndpoint = nextPages._links.next;
  }

  searchResults.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayloadService(result, links.base);
    await sendSlackMessageService(payload);
  });
  updatePollingInfoService();
}
