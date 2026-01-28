import { Confluence } from "~/types";
import { multiSortBy } from "~/utils";

/**
 * Confluence の検索結果を更新日時 (`version.when`) に基づいて昇順にソートする関数。
 *
 * 各検索結果の `version.when` プロパティを基準にソートします。
 *
 * 基本的に想定していないパターンだが、`version.when` が `null` または `undefined` の場合は、
 * `1970-01-01T00:00:00Z`（`new Date(0)`）として扱います。
 *
 * @param {Confluence.SearchResult[]} searchResults - ソート対象の Confluence 検索結果の配列。
 * @returns {Confluence.SearchResult[]} - 更新日時に基づいて昇順にソートされた検索結果の配列。
 *
 * @example
 * const searchResults = [
 *   { id: "1", version: { when: "2023-01-01T00:00:00Z" } },
 *   { id: "2", version: { when: "2022-12-01T00:00:00Z" } },
 *   { id: "3", version: { when: null } },
 * ];
 * const sortedResults = sortSearchResultsByUpdatedAtAsc(searchResults);
 * console.log(sortedResults);
 * // [
 * //   { id: "2", version: { when: "2022-12-01T00:00:00Z" } },
 * //   { id: "1", version: { when: "2023-01-01T00:00:00Z" } },
 * //   { id: "3", version: { when: null } },
 * // ]
 */
export function sortSearchResultsByUpdatedAtAsc(
  searchResults: Confluence.SearchResult[],
): Confluence.SearchResult[] {
  return multiSortBy(searchResults, [
    {
      getValue: (result) => result.version?.when ?? new Date(0),
      order: "asc",
    },
  ]);
}
