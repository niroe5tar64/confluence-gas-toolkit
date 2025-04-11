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
export function convertSearchResultToMessagePayload(
  searchResult: Confluence.SearchResult,
  baseUrl: string,
): Slack.MessagePayload {
  const { id, title, version } = searchResult;

  if (!version || version.number < 2) {
    return { blocks: [] };
  }

  const diffQuery = toQueryString({
    pageId: id,
    originalVersion: String(version.number - 1),
    revisedVersion: String(version.number),
  });

  return createSlackMessagePayload({
    messageTitle: getEnvVariable("SLACK_HEADER_TEXT") || "Confluence-Slack通知",
    pageTitle: title,
    pageUrl: `${baseUrl}/pages/viewpage.action?pageId=${id}`,
    diffUrl: `${baseUrl}/pages/diffpagesbyversion.action?${diffQuery}`,
    updatedBy: version.by.displayName,
    updatedAt: formatDateJST(version.when),
  });
}

/** 以降はプライベートな定義群 */
interface SlackMessagePayloadArgs {
  messageTitle: string;
  pageTitle: string;
  pageUrl: string;
  diffUrl: string;
  updatedBy: string;
  updatedAt: string;
}

function createSlackMessagePayload(args: SlackMessagePayloadArgs): Slack.MessagePayload {
  const { messageTitle, pageTitle, pageUrl, diffUrl, updatedBy, updatedAt } = args;
  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: messageTitle,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Page:*\n<${pageUrl}|${pageTitle}> (<${diffUrl}|diff>)`,
          },
          {
            type: "mrkdwn",
            text: `*Updated by:* ${updatedBy}\n*Updated at:* ${updatedAt}`,
          },
        ],
      },
    ],
  };
}
