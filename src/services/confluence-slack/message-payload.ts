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

  const diffQuery =
    version && version.number > 1
      ? toQueryString({
          pageId: id,
          originalVersion: String(version.number - 1),
          revisedVersion: String(version.number),
        })
      : undefined;

  return createSlackMessagePayload({
    messageTitle: getEnvVariable("SLACK_HEADER_TEXT") ?? "Confluence-Slack通知",
    pageTitle: title,
    pageUrl: `${baseUrl}/pages/viewpage.action?pageId=${id}`,
    diffUrl: diffQuery ? `${baseUrl}/pages/diffpagesbyversion.action?${diffQuery}` : undefined,
    updatedBy: version?.by.displayName,
    updatedAt: version?.when ? formatDateJST(version.when) : undefined,
  });
}

/** 以降はプライベートな定義群 */
interface SlackMessagePayloadArgs {
  messageTitle: string;
  pageTitle: string;
  pageUrl: string;
  diffUrl?: string;
  updatedBy?: string;
  updatedAt?: string;
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
            text: diffUrl
              ? `*Page:*\n<${pageUrl}|${pageTitle}> (<${diffUrl}|diff>)`
              : `*Page:*\n<${pageUrl}|${pageTitle}>`,
          },
          {
            type: "mrkdwn",
            text: `*Updated by:* ${updatedBy ?? "不明"}\n*Updated at:* ${updatedAt ?? "不明"}`,
          },
        ],
      },
    ],
  };
}
