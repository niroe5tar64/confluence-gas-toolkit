import { Confluence, Slack } from "~/types";
import { formatDateJST, getEnvVariable, toQueryString } from "~/utils";

/**
 * Confluence の検索結果を元に Slack メッセージのペイロードを生成する関数。
 *
 * 検索結果のページ情報を基に、Slack に送信可能なメッセージ形式に変換します。
 * ページのタイトル、更新者、更新日時、差分リンクなどを含むメッセージを生成します。
 *
 * @param {Confluence.SearchResult} searchResult - Confluence の検索結果オブジェクト。
 * @param {string} baseUrl - Confluence のベース URL。
 * @returns {Slack.MessagePayload} - Slack に送信可能なメッセージペイロード。
 */
export function convertSearchResultToMessagePayloadService(
  searchResult: Confluence.SearchResult,
  baseUrl: string,
): Slack.MessagePayload {
  const { id, title, version } = searchResult;

  if (!version || version.number < 2) {
    return { blocks: [] };
  }

  const pageUrl = `${baseUrl}/pages/viewpage.action?pageId=${id}`;
  const diffQuery = toQueryString({
    pageId: id,
    originalVersion: String(version.number - 1),
    revisedVersion: String(version.number),
  });
  const diffUrl = `${baseUrl}/pages/diffpagesbyversion.action?${diffQuery}`;
  const updatedAt = formatDateJST(version.when);

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: getEnvVariable("SLACK_HEADER_TEXT") || "Confluence-Slack通知",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Page:*\n<${pageUrl}|${title}> (<${diffUrl}|diff>)`,
          },
          {
            type: "mrkdwn",
            text: `*Updated by:* ${version.by.displayName}\n*Updated at:* ${updatedAt}`,
          },
        ],
      },
    ],
  };
}
