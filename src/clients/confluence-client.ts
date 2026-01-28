import type { Confluence } from "~/types";
import { getEnvVariable, toQueryString } from "~/utils";

import HttpClient from "./http-client";

/**
 * Confluence API クライアント
 *
 * Confluence の REST API に対する HTTP リクエストを送信し、データを取得するためのクラス。
 * Google Apps Script (GAS) 環境では `UrlFetchApp.fetch()` を、
 * Node.js / Bun 環境では `fetch()` を使用して API にアクセスする。
 */
export default class ConfluenceClient extends HttpClient {
  private static instance: ConfluenceClient | null = null;

  private baseUrl: string;
  private token: string;
  private spaceKey: string;
  private rootPageId: string;

  /**
   * Confluence クライアントのインスタンスを作成する。
   *
   * @param {string} baseUrl - Confluence API のベース URL (例: `"https://your-domain.atlassian.net/wiki"`)
   * @param {string} token - API リクエストに使用する Bearer トークン
   * @param {string} spaceKey - 対象となる Confluence の Space Key
   * @param {string} rootPageId - 対象となる Confluence Page の ID
   */
  private constructor(baseUrl: string, token: string, spaceKey: string, rootPageId: string) {
    super();
    this.baseUrl = baseUrl;
    this.token = token;
    this.spaceKey = spaceKey;
    this.rootPageId = rootPageId;
  }

  /**
   * ConfluenceClient のシングルトンインスタンスを取得する。
   *
   * 初回呼び出し時にインスタンスを生成し、以降は同じインスタンスを返す。
   * 環境変数から必要な設定値を取得してインスタンスを初期化する。
   *
   * @returns {ConfluenceClient} ConfluenceClient のシングルトンインスタンス
   * @throws {Error} 環境変数が正しく設定されていない場合にスローされる
   */
  public static getInstance(): ConfluenceClient {
    if (!ConfluenceClient.instance) {
      const baseUrl = getEnvVariable("CONFLUENCE_URL") || "";
      const token = getEnvVariable("CONFLUENCE_PAT") || "";
      const spaceKey = getEnvVariable("SPACE_KEY") || "";
      const rootPageId = getEnvVariable("ROOT_PAGE_ID") || "";
      if (!baseUrl || !token || !spaceKey || !rootPageId) {
        throw new Error("環境変数が正しく設定されていません。");
      }
      ConfluenceClient.instance = new ConfluenceClient(baseUrl, token, spaceKey, rootPageId);
    }
    return ConfluenceClient.instance;
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
   * @param {string | Record<string, string | number | boolean> | Blob} [requestBody] - 送信するリクエストボディ
   *   - `string`: JSON 以外のテキストデータを送信する場合
   *   - `Record<string, string | number | boolean>`: JSON 形式のデータを送信する場合 (自動的に `JSON.stringify()` される)
   *   - `Blob`: バイナリデータを送信する場合
   * @returns {Promise<T>} API レスポンスを JSON としてパースしたオブジェクト
   *
   * @throws {Error} API リクエストに失敗した場合
   */
  async callApi<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    requestBody?: string | Record<string, string | number | boolean> | Blob,
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
      const json = await this.responseToJson(response);

      // ローカル環境 (Node.js / Bun)
      if ("status" in response && response.status >= 400) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      // GAS 環境
      if ("getResponseCode" in response && response.getResponseCode() >= 400) {
        throw new Error(`HTTP Error: ${response.getResponseCode()}`);
      }

      return this.deepTransform(json) as T;
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
   * @returns {Promise<Confluence.Content>} ページ情報を含む `Confluence.Content` オブジェクト
   *
   * @throws {Error} ページの取得に失敗した場合
   */
  async getPage(request: { pageId: string }): Promise<Confluence.Content> {
    return await this.callApi<Confluence.Content>("GET", `/rest/api/content/${request.pageId}`);
  }

  /**
   * 指定された検索クエリを使用して、Confluenceページを検索します。
   *
   * Confluence API の検索エンドポイントに GET リクエストを送信し、
   * クエリに一致するページを取得します。
   *
   * @param {Object} request - 検索クエリを含むオブジェクト。
   * @param {string} request.extraCql - 追加の Confluence Query Language（CQL）条件。
   *                                    デフォルトの CQL に対して、実行時に追加される検索クエリを指定します。
   * @param {Confluence.SearchRequestOption} [request.option] - 検索リクエストの追加オプション。
   * @param {number} [request.option.start] - 取得を開始する位置を指定するオフセット。デフォルトは 0 です。
   * @param {number} [request.option.limit] - 取得する結果の最大数。デフォルトは 25 です。
   * @param {string} [request.option.expand] - 取得する追加情報を指定するためのプロパティ。カンマ区切りで複数指定可能です。
   * @param {string} [request.option.cqlcontext] - 検索クエリのコンテキストを指定する JSON 文字列。例：'{"spaceKey": "SomeSpaceKey"}'
   *
   * @returns {Promise<Confluence.SearchPage>} 検索結果を含む `Confluence.SearchPage` オブジェクトの Promise。
   *
   * @throws {Error} APIリクエストに失敗した場合、エラーをスローします。
   */
  async getSearchPage(request: {
    extraCql?: string;
    option?: Confluence.SearchRequestOption;
  }): Promise<Confluence.SearchPage> {
    const cqlList = [
      "type=page", // ページコンテンツのみ取得
      `space=${this.spaceKey}`, // 対象となるスペースのページのみ取得
      `ancestor=${this.rootPageId}`, // 監視ページ配下の全ページを対象とする
    ];
    if (request.extraCql) {
      cqlList.push(request.extraCql);
    }
    const cql = cqlList.join(" AND ");
    const queryObject = request.option ? { ...request.option, cql } : { cql };

    return await this.callApi<Confluence.SearchPage>(
      "GET",
      `/rest/api/content/search?${toQueryString(queryObject)}`,
    );
  }
}
