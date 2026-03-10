import { getConfluenceClient } from "~/clients";
import type { Confluence, JobName } from "~/types";
import { createLogger, formatDateJST, sleep } from "~/utils";

/**
 * Confluence API を呼び出す汎用サービス関数。
 *
 * 指定されたエンドポイントに対して GET リクエストを送信し、レスポンスを型指定されたデータとして返します。
 *
 * @template T - レスポンスデータの型。
 * @param {string} endpoint - 呼び出す Confluence API のエンドポイント。
 * @param {JobName} jobName - ジョブ名（ジョブ固有の設定を使用）
 * @returns {Promise<T>} - 型指定されたレスポンスデータを含む Promise。
 *
 * @throws {Error} - API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchConfluenceApi<T>(endpoint: string, jobName: JobName): Promise<T> {
  const client = getConfluenceClient(jobName);
  return client.callApi<T>("GET", endpoint);
}

/**
 * Confluence の最近変更されたページを取得するサービス関数。
 *
 * 指定されたタイムスタンプ以降に変更されたページを取得します。
 *
 * @param {string} timestamp - 変更されたページを取得する基準となるタイムスタンプで"YYYY/MM/DD hh:mm"形式の文字列で指定します。
 * @param {JobName} jobName - ジョブ名（ジョブ固有の設定を使用）
 * @returns {Promise<Confluence.SearchPage>} - 検索結果を含む `Confluence.SearchPage` オブジェクト。
 *
 * @throws {Error} - API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchRecentChanges(
  timestamp: string,
  jobName: JobName,
): Promise<Confluence.SearchPage> {
  const client = getConfluenceClient(jobName);
  const logger = createLogger("RecentChanges");
  const extraCql = `lastModified > '${formatDateJST(timestamp)}' ORDER BY lastModified DESC`; // 指定した日時以降に変更されたページを取得

  logger.debug("検索開始", { cql: extraCql, rootPageIds: client.rootPageIds });

  const searchPages = await client.getSearchPage({
    extraCql,
    option: { expand: "history,version" },
  });
  // 検索結果が複数ページに渡る場合、すべてのページをループで取得する
  let searchResults = searchPages.results;
  let nextEndpoint = searchPages._links?.next;
  let pageCount = 1;
  while (nextEndpoint) {
    pageCount += 1;
    // Confluence の帯域制限を避けるため、ページネーション間に短い待機を入れる
    await sleep(400);
    const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint, jobName);
    // 結果を蓄積
    searchResults = [...searchResults, ...nextPages.results];
    logger.debug("ページネーション", {
      page: pageCount,
      fetchedCount: nextPages.results.length,
      cumulative: searchResults.length,
      hasNext: !!nextPages._links?.next,
    });
    nextEndpoint = nextPages._links?.next;
  }

  logger.info("検索完了", {
    totalCount: searchResults.length,
    pageCount,
    rootPageIds: client.rootPageIds,
  });

  return { ...searchPages, results: searchResults };
}

/**
 * Confluence のすべてのページを取得するサービス関数。
 *
 * Confluence API を使用して、すべてのページを取得します。
 * ページが複数に分割されている場合、ページネーションを処理してすべての結果を統合します。
 *
 * @param {JobName} jobName - ジョブ名（ジョブ固有の設定を使用）
 * @returns {Promise<Confluence.SearchPage>} - すべてのページを含む `Confluence.SearchPage` オブジェクト。
 *
 * @throws {Error} - API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchAllPages(jobName: JobName): Promise<Confluence.SearchPage> {
  const client = getConfluenceClient(jobName);
  const searchPages = await client.getSearchPage({
    option: { expand: "version", limit: 100, start: 0 },
  });
  // 検索結果が複数ページに渡る場合、すべてのページをループで取得する
  let searchResults = searchPages.results;
  let nextEndpoint = searchPages._links?.next;
  while (nextEndpoint) {
    await sleep(400);
    const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint, jobName);
    // 結果を蓄積
    searchResults = [...searchResults, ...nextPages.results];
    nextEndpoint = nextPages._links?.next;
  }
  return { ...searchPages, results: searchResults };
}
