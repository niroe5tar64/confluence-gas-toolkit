import type {
  Content as ConfluenceContent,
  SearchPageResponseSearchResult,
  SearchRequest,
  SearchResult as ConfluenceSearchResult,
} from "fetch-confluence";

/**
 * Confluence API に関連する型定義。
 *
 * このファイルでは、Confluence API のリクエストおよびレスポンスに関連する型を定義しています。
 * `fetch-confluence` パッケージからインポートした型を拡張またはカスタマイズすることで、
 * プロジェクト内で統一的に扱えるようにしています。
 *
 * 参考:
 * - fetch-confluence パッケージの型定義
 *   https://www.npmjs.com/package/fetch-confluence
 */
export namespace Confluence {
  /********* Confluence API リクエスト *********/
  export interface SearchRequestOption extends Omit<SearchRequest, "cql"> {
    expand: string;
  }

  /********* Confluence API レスポンス *********/
  export interface Content extends ConfluenceContent {}

  export interface SearchResult extends Omit<ConfluenceSearchResult, "content">, ConfluenceContent {
    /* 
      Note: ConfluenceAPIのオンプレ版とクラウド版でレスポンスが異なる。
            オンプレ版ではContentが展開されて同階層に存在しているのに対し、
            クラウド版ではContentプロパティとして存在している。
      
      ※ 補足説明: `extends Omit<ConfluenceSearchResult, "content">, ConfluenceContent {}`の意味
        const confluenceSearchResult: ConfluenceSearchResult = { ... };
        const confluenceContent: ConfluenceContent = { ... };
        
        const tempObj = { ...confluenceSearchResult, ...confluenceContent };
        const searchResult: SearchResult = Object.entries(tempObj).filter(([key]) => key !== "content");
    */
  }
  export interface SearchPage extends Omit<SearchPageResponseSearchResult, "results"> {
    results: Array<SearchResult>;
  }
}
