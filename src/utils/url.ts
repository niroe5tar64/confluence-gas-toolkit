/**
 * オブジェクトを `URLSearchParams` に適したクエリ文字列に変換する関数
 * @param params クエリパラメータのオブジェクト
 * @returns URL エンコードされたクエリ文字列
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function convertToQueryString(params: Record<string, any>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, value]) => value !== undefined) // undefined の項目を除外
        .map(([key, value]) => [key, String(value)]), // すべての値を string に変換
    ),
  ).toString();
}
