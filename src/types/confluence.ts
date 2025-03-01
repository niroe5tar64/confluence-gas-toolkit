import type {
  Content as ConfluenceContent,
  SearchPageResponseSearchResult,
} from "fetch-confluence";

export namespace Confluence {
  export interface Content extends ConfluenceContent {}
  export interface SearchPage extends SearchPageResponseSearchResult {}
}
