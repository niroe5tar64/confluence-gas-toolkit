import { ConfluenceClient } from "~/clients";
import { formatDateJST } from "~/utils";
import { Confluence } from "~/types";

/**
 * Confluence API を呼び出す汎用サービス関数。
 *
 * 指定されたエンドポイントに対して GET リクエストを送信し、レスポンスを型指定されたデータとして返します。
 *
 * @template T - レスポンスデータの型。
 * @param {string} endpoint - 呼び出す Confluence API のエンドポイント。
 * @returns {Promise<T>} - 型指定されたレスポンスデータを含む Promise。
 *
 * @throws {Error} - API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchConfluenceApi<T>(endpoint: string): Promise<T> {
  const client = ConfluenceClient.getInstance();
  return client.callApi<Promise<T>>("GET", endpoint);
}

/**
 * Confluence の最近変更されたページを取得するサービス関数。
 *
 * 指定されたタイムスタンプ以降に変更されたページを取得します。
 *
 * @param {string} [timestamp] - 変更されたページを取得する基準となるタイムスタンプで"YYYY/MM/DD hh:mm"形式の文字列で指定します。
 * @returns {Promise<Confluence.SearchPage>} - 検索結果を含む `Confluence.SearchPage` オブジェクト。
 *
 * @throws {Error} - API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchRecentChanges(timestamp: string): Promise<Confluence.SearchPage> {
  const client = ConfluenceClient.getInstance();
  const extraCql = `lastModified > '${formatDateJST(timestamp)}' ORDER BY lastModified DESC`; // 指定した日時以降に変更されたページを取得

  return await client.getSearchPage({ extraCql, option: { expand: "history,version" } });
}
