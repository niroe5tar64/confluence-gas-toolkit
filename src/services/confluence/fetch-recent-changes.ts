import { ConfluenceClient } from "~/clients";
import { Confluence } from "~/types";

/**
 * Confluence の最近変更されたページを取得するサービス関数。
 *
 * 指定されたタイムスタンプ以降に変更されたページを取得します。
 * タイムスタンプが指定されない場合は、直近15分間に変更されたページを取得します。
 *
 * @param {string | null} [timestamp] - 変更されたページを取得する基準となるタイムスタンプで"YYYY/MM/DD hh:mm"形式の文字列で指定します。
 *                                      指定しない場合は直近15分間が対象となります。
 * @returns {Promise<Confluence.SearchPage>} - 検索結果を含む `Confluence.SearchPage` オブジェクト。
 *
 * @throws {Error} - 必要な環境変数 (`CONFLUENCE_URL`, `CONFLUENCE_PAT`, `SPACE_KEY`, `ROOT_PAGE_ID`) が
 *                   設定されていない場合や、API リクエストに失敗した場合にエラーをスローします。
 */
export async function fetchRecentChangesService(
  timestamp?: string | null,
): Promise<Confluence.SearchPage> {
  const client = ConfluenceClient.getInstance();
  const extraCql = timestamp
    ? `lastModified > '${timestamp}' ORDER BY lastModified DESC` // 指定した日時以降に変更されたページを取得
    : "lastModified > now('-15m') ORDER BY lastModified DESC"; // 日時指定がない場合は直近15分間に変更されたページを取得

  return await client.getSearchPage({ extraCql, option: { expand: "history,version" } });
}
