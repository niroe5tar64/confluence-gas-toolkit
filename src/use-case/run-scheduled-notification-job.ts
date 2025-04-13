import {
  fetchConfluenceApi,
  fetchRecentChanges,
  sendSlackMessage,
  parsePollingInfo,
  updatePollingInfo,
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
  // 前回実行時のタイムスタンプを読み取る（存在しない場合は null）
  const pollingInfo = parsePollingInfo();

  // タイムスタンプ以降に更新されたページ一覧を取得（最大 limit 件まで）
  const recentChangePages = await fetchRecentChanges(pollingInfo?.timestamp);
  let { results: searchResults, _links: links } = recentChangePages;

  // 検索結果が複数ページに渡る場合、すべてのページをループで取得する
  let nextEndpoint = links?.next;
  while (nextEndpoint) {
    const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint);
    // 結果を蓄積
    searchResults = [...searchResults, ...nextPages.results];
    nextEndpoint = nextPages._links.next;
  }

  searchResults.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayload(result, links.base);
    await sendSlackMessage(payload);
  });

  // 最後に今回の実行時刻を保存し、次回以降の差分取得に備える
  updatePollingInfo();
}
