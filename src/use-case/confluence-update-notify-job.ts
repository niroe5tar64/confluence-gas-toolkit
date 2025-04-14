import {
  fetchConfluenceApi,
  fetchRecentChanges,
  sendSlackMessage,
  parsePollingInfo,
  updatePollingInfo,
  sortSearchResultsByUpdatedAtAsc,
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
export async function confluenceUpdateNotifyJob() {
  // 前回実行時のタイムスタンプを読み取る（存在しない or 日時が無効な場合は15分前）
  const pollingInfo = parsePollingInfo();
  const timestampISOString =
    pollingInfo?.timestamp && !Number.isNaN(new Date(pollingInfo?.timestamp))
      ? pollingInfo?.timestamp
      : new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // タイムスタンプ以降に更新されたページ一覧を取得（最大 limit 件まで）
  const recentChangePages = await fetchRecentChanges(timestampISOString);
  let { results: searchResults, _links: links } = recentChangePages;

  // 検索結果が複数ページに渡る場合、すべてのページをループで取得する
  let nextEndpoint = links?.next;
  while (nextEndpoint) {
    const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint);
    // 結果を蓄積
    searchResults = [...searchResults, ...nextPages.results];
    nextEndpoint = nextPages._links.next;
  }

  // Confluence API から取得した検索結果を時系列順に並べ替え、
  // 各結果を Slack メッセージのペイロードに変換して送信します。
  const sortedSearchResults = sortSearchResultsByUpdatedAtAsc(searchResults);
  sortedSearchResults.map(async (result: Confluence.SearchResult) => {
    const payload = convertSearchResultToMessagePayload(result, links.base);
    await sendSlackMessage(payload);
  });

  // 最も最近の更新日時を特定し次回以降の差分取得に備えてタイムスタンプを保存する
  const updatedAtList: Date[] = searchResults
    .map((result) => result.version)
    .map((version) => version?.when)
    .filter((when) => when !== undefined);
  const latestUpdatedAt = new Date(Math.max(...updatedAtList.map((date) => date.getTime())));

  updatePollingInfo({
    ...(pollingInfo ?? {}),
    timestamp: Number.isNaN(latestUpdatedAt.getTime())
      ? timestampISOString
      : latestUpdatedAt.toISOString(),
  });
}
