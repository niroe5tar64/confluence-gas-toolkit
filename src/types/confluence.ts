/**
 * Confluence API に関連する型定義。
 *
 * このファイルでは、Confluence API のリクエストおよびレスポンスに関連する型を定義しています。
 * 実際に使用されているプロパティのみを定義した最小限の型定義を提供します。
 *
 * 参考:
 * - Confluence REST API ドキュメント（Cloud）
 *   https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
 * - Confluence Server/Data Center API ドキュメント
 *   https://docs.atlassian.com/confluence/server/
 */

export namespace Confluence {
  /**
   * Confluence API 検索リクエストのオプション
   */
  export interface SearchRequestOption {
    /** 取得を開始する位置を指定するオフセット（デフォルト: 0） */
    start?: number;
    /** 取得する結果の最大数（デフォルト: 25） */
    limit?: number;
    /** 取得する追加情報を指定（カンマ区切りで複数指定可能） */
    expand?: string;
    /** 検索クエリのコンテキスト（JSON 文字列） */
    cqlcontext?: string;
    [key: string]: unknown;
  }

  /**
   * Confluence ページコンテンツオブジェクト
   */
  export interface Content {
    /** ページの ID */
    id: string;
    /** ページのタイトル */
    title: string;
    /** コンテンツの種類（"page", "blogpost" など） */
    type: string;
    /** リンク情報（self, webui など） */
    _links?: { [key: string]: string };
    [key: string]: unknown;
  }

  /**
   * Confluence ページのバージョン情報
   */
  export interface Version {
    /** 更新者情報 */
    by: {
      /** 更新者の表示名 */
      displayName: string;
      [key: string]: unknown;
    };
    /** 更新日時（ISO 8601 形式） */
    when: Date;
    /** バージョン番号 */
    number: number;
    [key: string]: unknown;
  }

  /**
   * Confluence 検索結果のオブジェクト
   *
   * Note: Confluence API のオンプレ版とクラウド版でレスポンス形式が異なる。
   *       オンプレ版ではコンテンツプロパティが展開されて同階層に存在するのに対し、
   *       クラウド版ではコンテンツプロパティとして存在している。
   *       このインターフェースはオンプレ版の形式（フラット化）に対応している。
   */
  export interface SearchResult extends Content {
    /** ページのバージョン情報 */
    version?: Version;
    [key: string]: unknown;
  }

  /**
   * Confluence 検索結果のページ情報
   */
  export interface SearchPage {
    /** 検索結果のページネーション情報 */
    _links: { [key: string]: string };
    /** 検索結果の配列 */
    results: SearchResult[];
    /** オフセット情報 */
    start?: number;
    /** 1 ページあたりの結果数 */
    limit?: number;
    /** 検索結果の合計数 */
    size?: number;
    [key: string]: unknown;
  }
}
