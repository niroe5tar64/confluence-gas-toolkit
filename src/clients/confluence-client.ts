import { CONFLUENCE_PAGE_CONFIGS, type PageConfig, validatePageConfigs } from "~/config";
import type { Confluence, JobName } from "~/types";
import { createLogger, getEnvVariable, toQueryString } from "~/utils";

import HttpClient from "./http-client";

// ページ設定のキャッシュ
let cachedPageConfigs: Record<JobName, PageConfig> | null = null;

// ジョブごとのクライアントインスタンスレジストリ
const clientsMap = new Map<JobName, ConfluenceClient>();

/**
 * ページ設定をパースして返す
 */
function getPageConfigs(): Record<JobName, PageConfig> {
  if (cachedPageConfigs) {
    return cachedPageConfigs;
  }

  cachedPageConfigs = validatePageConfigs(CONFLUENCE_PAGE_CONFIGS);
  return cachedPageConfigs;
}

/**
 * ジョブ名に対応する ConfluenceClient インスタンスを取得する
 * キャッシュされたインスタンスがあれば、それを返す
 *
 * @param {JobName} jobName - ジョブ名
 * @returns {ConfluenceClient} ConfluenceClient のインスタンス
 * @throws {Error} ページ設定が見つからない場合、またはConfluence認証情報が未設定の場合
 */
export function getConfluenceClient(jobName: JobName): ConfluenceClient {
  const cached = clientsMap.get(jobName);
  if (cached) {
    return cached;
  }

  const configs = getPageConfigs();
  const config = configs[jobName];
  if (!config?.rootPageIds?.length || !config?.spaceKey) {
    throw new Error(`ジョブ ${jobName} の設定が見つかりません`);
  }

  const baseUrl = getEnvVariable("CONFLUENCE_URL");
  const token = getEnvVariable("CONFLUENCE_PAT");
  if (!baseUrl || !token) {
    const missingEnv = [];
    if (!baseUrl) missingEnv.push("CONFLUENCE_URL");
    if (!token) missingEnv.push("CONFLUENCE_PAT");
    throw new Error(`必須環境変数が未設定です: ${missingEnv.join(", ")}`);
  }

  // 複数ページ対応：第1ページをメインのrootPageIdとして使用
  const client = new ConfluenceClient(
    baseUrl,
    token,
    config.spaceKey,
    config.rootPageIds[0],
    config.rootPageIds,
  );

  clientsMap.set(jobName, client);
  return client;
}

/**
 * テスト用: キャッシュをリセット
 * getConfluenceClient() と getInstance() の両方のキャッシュをクリアする
 * @internal
 */
export function resetConfluenceClientCache(): void {
  cachedPageConfigs = null;
  clientsMap.clear();
  ConfluenceClient.resetInstance();
}

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
  public readonly rootPageIds: string[];
  private logger = createLogger("ConfluenceClient");

  /**
   * Confluence クライアントのインスタンスを作成する。
   *
   * @param {string} baseUrl - Confluence API のベース URL (例: `"https://your-domain.atlassian.net/wiki"`)
   * @param {string} token - API リクエストに使用する Bearer トークン
   * @param {string} spaceKey - 対象となる Confluence の Space Key
   * @param {string} rootPageId - 対象となる Confluence Page の ID (複数ページ指定時はメインのページID)
   * @param {string[]} [rootPageIds] - 複数ページ対応：すべての対象ページIDの配列
   */
  public constructor(
    baseUrl: string,
    token: string,
    spaceKey: string,
    rootPageId: string,
    rootPageIds?: string[],
  ) {
    super();
    this.baseUrl = baseUrl;
    this.token = token;
    this.spaceKey = spaceKey;
    this.rootPageId = rootPageId;
    this.rootPageIds = rootPageIds || [rootPageId];

    this.logger.debug("ConfluenceClient初期化", {
      spaceKey: this.spaceKey,
      rootPageIds: this.rootPageIds,
      rootPageCount: this.rootPageIds.length,
    });
  }

  /**
   * テスト用: シングルトンインスタンスをリセット
   * @internal
   */
  public static resetInstance(): void {
    ConfluenceClient.instance = null;
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
    this.logger.debug("リクエスト送信", { method, endpoint });

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

    let status: number | undefined;

    try {
      const response = await this.httpRequest(`${this.baseUrl}${endpoint}`, options);
      const json = await this.responseToJson(response);

      if ("status" in response) {
        status = response.status;
      }
      if ("getResponseCode" in response) {
        status = response.getResponseCode();
      }

      // ローカル環境 (Node.js / Bun)
      if ("status" in response && response.status >= 400) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      // GAS 環境
      if ("getResponseCode" in response && response.getResponseCode() >= 400) {
        throw new Error(`HTTP Error: ${response.getResponseCode()}`);
      }

      const transformed = this.deepTransform(json) as T;

      this.logger.debug("レスポンス受信", {
        method,
        endpoint,
        status,
      });

      return transformed;
    } catch (error: unknown) {
      this.logger.error("API呼び出し失敗", error instanceof Error ? error : undefined, {
        method,
        endpoint,
        status: status ?? "unknown",
      });
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
   * 複数のrootPageIdsが指定されている場合、OR条件で結合します。
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
    if (this.rootPageIds.length === 0) {
      this.logger.warn("rootPageIdsが空のため処理スキップ", {
        spaceKey: this.spaceKey,
      });
      return { _links: {}, results: [], start: 0, limit: 0, size: 0 };
    }

    const cqlList = [
      "type=page", // ページコンテンツのみ取得
      `space=${this.spaceKey}`, // 対象となるスペースのページのみ取得
    ];

    // 複数ページ対応：OR条件で結合
    if (this.rootPageIds.length > 0) {
      const ancestorCql = this.rootPageIds.map((id) => `ancestor=${id}`).join(" OR ");
      cqlList.push(`(${ancestorCql})`);
    }

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
