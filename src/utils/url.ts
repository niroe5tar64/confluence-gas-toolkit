/**
 * オブジェクトを `URLSearchParams` に適したクエリ文字列に変換する関数
 * ※ GASではURLSearchParamsが利用不可なので自作関数で代替
 * @param params クエリパラメータのオブジェクト
 * @returns URL エンコードされたクエリ文字列
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function toQueryString(params: { [key: string]: any }): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined) // undefined を除外
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}
