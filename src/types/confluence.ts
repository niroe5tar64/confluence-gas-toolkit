import type {
  Content as ConfluenceContent,
  SearchPageResponseSearchResult,
  SearchRequest,
  SearchResult as ConfluenceSearchResult,
} from "fetch-confluence";

export namespace Confluence {
  /********* Confluence API リクエスト *********/
  export interface SearchRequestOption extends Omit<SearchRequest, "cql"> {
    expand: string;
  }

  /********* Confluence API レスポンス *********/
  export interface Content extends ConfluenceContent {}

  export interface SearchResult extends Omit<ConfluenceSearchResult, "content">, ConfluenceContent {
    // Note: 実際のレスポンスはContentが同階層に存在している。
  }
  export interface SearchPage extends Omit<SearchPageResponseSearchResult, "results"> {
    results: Array<SearchResult>;
  }
}
