import { Confluence, Slack } from "~/types";
import { formatDateJST, toQueryString } from "~/utils";

/**
 * Confluenceの検索結果をSlackメッセージのペイロードに変換します。
 *
 * この関数は、検索結果を処理してSlackで使用可能なメッセージ形式を生成します。
 * 各ページのタイトル、更新者、更新日時、および差分リンク（該当する場合）を含みます。
 *
 * @param {Confluence.SearchResult[]} searchResults - Confluenceの検索結果オブジェクトの配列。
 * @param {Record<string, number>} originalVersions - ページIDとその元のバージョン番号のマッピング。
 * @param {string} baseUrl - ConfluenceインスタンスのベースURL。
 * @returns {Slack.MessagePayload} - Slackメッセージとして送信可能な形式のペイロード。
 */
export function convertSearchResultsToSummaryPayload(
  searchResults: Confluence.SearchResult[],
  originalVersions: Record<string, number>,
  baseUrl: string,
): Slack.MessagePayload {
  const updatedPages = searchResults.map((result) =>
    createUpdatedPage(result, originalVersions[result.id] ?? 1, baseUrl),
  );
  return createSlackSummaryPayload({ title: "週次サマリー", updatedPages });
}

/** 以降はプライベートな定義群 */
interface SlackSummaryPayloadArgs {
  title: string;
  updatedPages: UpdatedPage[];
}

interface UpdatedPage {
  page: { text: string; url: string };
  diff?: { text: string; url: string };
  lastUpdated: {
    by?: string;
    at?: string;
  };
}

function createUpdatedPage(
  searchResult: Confluence.SearchResult,
  originalVersion: number,
  baseUrl: string,
) {
  const { id, title, version } = searchResult;
  const currentVersion = version?.number;

  const diffQuery =
    version && version.number > 1 && originalVersion !== currentVersion
      ? toQueryString({
          pageId: id,
          originalVersion: String(originalVersion),
          currentVersion: String(currentVersion),
        })
      : undefined;

  return {
    pageId: id,
    page: {
      text: title,
      url: `${baseUrl}/pages/viewpage.action?pageId=${id}`,
    },
    diff: diffQuery
      ? {
          text: `(ver${originalVersion}→${currentVersion})`,
          url: `${baseUrl}/pages/diffpagesbyversion.action?${diffQuery}`,
        }
      : undefined,
    lastUpdated: {
      by: version?.by.displayName,
      at: version?.when ? formatDateJST(version.when) : undefined,
    },
  };
}

function createSlackSummaryPayload(args: SlackSummaryPayloadArgs): Slack.MessagePayload {
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: args.title,
        },
      },
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              {
                type: "text",
                text: `今週は${args.updatedPages.length}件のページが更新されました。`,
              },
            ],
          },
          {
            type: "rich_text_list",
            style: "bullet",
            indent: 0,
            elements: args.updatedPages.map((updatedPage) => {
              const { page, diff, lastUpdated } = updatedPage;

              const richTextElements: Slack.RichTextElement[] = [];
              richTextElements.push({
                type: "link",
                url: page.url,
                text: page.text,
                style: { bold: true },
              });

              if (diff?.url) {
                richTextElements.push({
                  type: "link",
                  url: diff.url,
                  text: diff.text,
                });
              }

              // richTextElements.push({
              //   type: "text",
              //   text:
              //     `last updated at: ${lastUpdated.by ?? "不明"}` +
              //     `last updated by: ${lastUpdated.at ? formatDateJST(lastUpdated.at) : "不明"}`,
              // });

              return {
                type: "rich_text_section",
                elements: richTextElements,
              };
            }),
          },
        ],
      },
    ],
  };
}
