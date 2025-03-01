/**
 * HTTP クライアントクラス
 *
 * Google Apps Script (GAS) 環境では `UrlFetchApp.fetch()` を使用し、
 * Node.js / Bun 環境では `fetch()` を使用して HTTP リクエストを送信する。
 */
export default class HttpClient {
  /**
   * 指定された URL に対して HTTP リクエストを送信する。
   *
   * 環境に応じて、以下の方法でリクエストを実行する：
   * - **ローカル環境 (Node.js / Bun)**: `fetch()`
   * - **GAS 環境**: `UrlFetchApp.fetch()`
   *
   * @param {string} url - リクエスト先の URL
   * @param {RequestInit} [options={}] - リクエストのオプション (HTTP メソッド, ヘッダー, ボディなど)
   * @returns {Promise<Response | GoogleAppsScript.URL_Fetch.HTTPResponse>}
   *   - **GAS 環境**: `GoogleAppsScript.URL_Fetch.HTTPResponse`
   *   - **ローカル環境**: `Response`
   *
   * @throws {Error} 無効なリクエストオプションの場合、またはリクエストに失敗した場合
   */
  protected async httpRequest(
    url: string,
    options: RequestInit = {},
  ): Promise<Response | GoogleAppsScript.URL_Fetch.HTTPResponse> {
    if (process.env.TARGET !== "GAS") {
      // ローカル (Node.js / Bun)
      return fetch(url, options);
    }

    // GAS 環境
    const gasOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: (options.method?.toLowerCase() || "get") as GoogleAppsScript.URL_Fetch.HttpMethod,
      headers: options.headers as Record<string, string>,
      muteHttpExceptions: true,
    };

    if (options.body) {
      if (typeof options.body === "string") {
        gasOptions.payload = options.body;
        gasOptions.contentType = "text/plain";
      } else if (options.body instanceof Blob) {
        gasOptions.payload = options.body;
        gasOptions.contentType = options.body.type || "application/octet-stream";
      } else {
        gasOptions.payload = JSON.stringify(options.body);
        gasOptions.contentType = "application/json";
      }
    }

    return UrlFetchApp.fetch(url, gasOptions);
  }

  /**
   * HTTP レスポンスを JSON に変換する。
   *
   * 環境に応じて異なるパース処理を行う：
   * - **ローカル環境** (`fetch`) の場合、`json()` メソッドを使用して JSON を取得する。
   * - **GAS 環境** (`UrlFetchApp.fetch`) の場合、`getContentText()` を使用して JSON をパースする。
   *
   * @param {Response | GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP リクエストのレスポンス
   * @returns {Promise<any>} パースされた JSON データ
   *
   * @throws {Error} JSON のパースに失敗した場合
   */
  protected responseToJson(response: Response | GoogleAppsScript.URL_Fetch.HTTPResponse) {
    if ("json" in response) {
      // ローカル環境 (`Response`)
      return response.json();
    }
    // GAS 環境 (`GoogleAppsScript.URL_Fetch.HTTPResponse`)
    return JSON.parse(response.getContentText());
  }
}
