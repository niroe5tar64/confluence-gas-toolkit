/**
 * RequestInit["headers"] から指定されたヘッダー値を取得する
 * Headers オブジェクト、配列、オブジェクトリテラルの全形式に対応
 *
 * @param headers - RequestInit["headers"] 形式のヘッダー
 * @param key - 取得するヘッダー名（大文字小文字を区別しない）
 * @returns ヘッダー値、存在しない場合は undefined
 */
function getHeaderValue(headers: RequestInit["headers"], key: string): string | undefined {
  if (!headers) return undefined;

  const lowerKey = key.toLowerCase();

  // Headers オブジェクトの場合
  if (headers instanceof Headers) {
    return headers.get(key) ?? undefined;
  }

  // 配列形式 [string, string][] の場合
  if (Array.isArray(headers)) {
    const found = headers.find(([k]) => k.toLowerCase() === lowerKey);
    return found?.[1];
  }

  // オブジェクトリテラル Record<string, string> の場合
  const record = headers as Record<string, string>;
  for (const k of Object.keys(record)) {
    if (k.toLowerCase() === lowerKey) {
      return record[k];
    }
  }
  return undefined;
}

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
    const headerContentType = getHeaderValue(options.headers, "Content-Type");

    const gasOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
      method: (options.method?.toLowerCase() || "get") as GoogleAppsScript.URL_Fetch.HttpMethod,
      headers: options.headers as Record<string, string>,
      muteHttpExceptions: true,
    };

    if (options.body) {
      if (typeof options.body === "string") {
        gasOptions.payload = options.body;
        // Slack Webhook など JSON 文字列を送るケースでもヘッダー指定を尊重する
        gasOptions.contentType = headerContentType ?? "text/plain";
      } else if (options.body instanceof Blob) {
        gasOptions.payload = options.body;
        gasOptions.contentType =
          headerContentType ?? (options.body.type || "application/octet-stream");
      } else {
        gasOptions.payload = JSON.stringify(options.body);
        gasOptions.contentType = headerContentType ?? "application/json";
      }
    } else if (headerContentType) {
      gasOptions.contentType = headerContentType;
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

  /**
   * 再帰的に入力データを解析し、特定の条件に基づいて値を変換する関数。
   *
   * 現在の実装では、ISO 8601 形式の日時文字列を `Date` 型に変換します。
   * 配列やオブジェクトを再帰的に処理し、ネストされたデータ構造にも対応しています。
   *
   * - ISO 8601 形式の日時文字列: `2025-03-11T13:09:27.551+09:00` のような文字列を `Date` 型に変換します。
   * - 無効な日時文字列の場合は、元の文字列をそのまま返します。
   * - 配列やオブジェクト内の値も再帰的に処理します。
   *
   * @template T - 入力データの型
   * @param {T} input - 変換対象のデータ。文字列、配列、オブジェクト、またはその他の型を受け付けます。
   * @returns {T} 変換後のデータ。元の構造を維持しつつ、必要な値が変換されたデータを返します。
   *
   * @example
   * // ISO 8601 形式の日時文字列を含むオブジェクトを変換
   * const input = {
   *   date: "2025-03-11T13:09:27.551+09:00",
   *   nested: {
   *     dates: ["2025-03-11T13:09:27.551+09:00", "invalid-date"],
   *   },
   * };
   * const output = deepTransform(input);
   * console.log(output.date instanceof Date); // true
   * console.log(output.nested.dates[0] instanceof Date); // true
   * console.log(output.nested.dates[1]); // "invalid-date"
   */
  protected deepTransform<T>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    // ISO 8601 形式の日時文字列を判定する正規表現
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

    if (typeof input === "string" && iso8601Regex.test(input)) {
      // ISO 8601 形式の文字列を Date 型に変換
      const date = new Date(input);
      // Date が無効な場合は元の文字列を返す
      return Number.isNaN(date.getTime()) ? (input as unknown as T) : (date as unknown as T);
    }

    if (Array.isArray(input)) {
      // 配列の場合、各要素を再帰的に処理
      return input.map((item) => this.deepTransform(item)) as unknown as T;
    }

    if (typeof input === "object") {
      // オブジェクトの場合、各プロパティを再帰的に処理
      const convertedObj: Record<string, unknown> = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          convertedObj[key] = this.deepTransform((input as Record<string, unknown>)[key]);
        }
      }
      return convertedObj as T;
    }

    // その他の型はそのまま返す
    return input;
  }
}
