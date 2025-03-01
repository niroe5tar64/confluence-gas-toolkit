import type { ConfluencePage } from "~/types";
import HttpClient from "./http-client";

/**
 * Confluence API クライアント
 *
 * Confluence の REST API に対する HTTP リクエストを送信し、データを取得するためのクラス。
 * Google Apps Script (GAS) 環境では `UrlFetchApp.fetch()` を、
 * Node.js / Bun 環境では `fetch()` を使用して API にアクセスする。
 */
export default class ConfluenceClient extends HttpClient {
  private baseUrl: string;
  private token: string;

  /**
   * Confluence クライアントのインスタンスを作成する。
   *
   * @param {string} baseUrl - Confluence API のベース URL (例: `"https://your-domain.atlassian.net/wiki"`)
   * @param {string} token - API リクエストに使用する Bearer トークン
   */
  constructor(baseUrl: string, token: string) {
    super();
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Confluence API に対して HTTP リクエストを送信する汎用メソッド。
   *
   * 指定した HTTP メソッド、エンドポイント、およびリクエストボディを使用して API リクエストを行う。
   * 環境に応じて、以下の方法でリクエストを実行する：
   * - **ローカル環境 (Node.js / Bun)**: `fetch()`
   * - **GAS 環境**: `UrlFetchApp.fetch()`
   *
   * @template T - 期待するレスポンスの型
   * @param {"GET" | "POST" | "PUT" | "DELETE"} method - HTTP メソッド
   * @param {string} endpoint - API のエンドポイント (例: `"/rest/api/content/12345"`)
   * @param {string | Record<string, string> | Blob} [requestBody] - 送信するリクエストボディ
   *   - `string`: JSON 以外のテキストデータを送信する場合
   *   - `Record<string, string>`: JSON 形式のデータを送信する場合 (自動的に `JSON.stringify()` される)
   *   - `Blob`: バイナリデータを送信する場合
   * @returns {Promise<T>} API レスポンスを JSON としてパースしたオブジェクト
   *
   * @throws {Error} API リクエストに失敗した場合
   */
  private async callApi<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    requestBody?: string | Record<string, string> | Blob,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };

    const body = requestBody
      ? typeof requestBody === "string" || requestBody instanceof Blob
        ? requestBody
        : JSON.stringify(requestBody)
      : undefined;

    const options: RequestInit = { method, headers, body };

    try {
      const response = await this.httpRequest(`${this.baseUrl}${endpoint}`, options);
      return this.responseToJson(response) as T;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Fetch failed:", error.message);
      } else {
        console.error("Unexpected error:", error);
      }
      throw error;
    }
  }

  /**
   * 指定されたページ ID の Confluence ページ情報を取得する。
   *
   * @param {Object} request - リクエストオブジェクト
   * @param {string} request.pageId - 取得するページの ID
   * @returns {Promise<ConfluencePage>} ページ情報を含む `ConfluencePage` オブジェクト
   *
   * @throws {Error} ページの取得に失敗した場合
   */
  async getPage(request: { pageId: string }): Promise<ConfluencePage> {
    return this.callApi<ConfluencePage>("GET", `/rest/api/content/${request.pageId}`);
  }
}
