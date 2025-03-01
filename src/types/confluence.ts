import type {
  Content as ConfluenceContent,
  SearchPageResponseSearchResult,
  SearchRequest,
} from "fetch-confluence";

export namespace Confluence {
  /********* Confluence API リクエスト *********/
  export interface SearchRequestOption extends Omit<SearchRequest, "cql"> {}

  /********* Confluence API レスポンス *********/
  export interface Content extends ConfluenceContent {}
  export interface SearchPage extends SearchPageResponseSearchResult {}
}
