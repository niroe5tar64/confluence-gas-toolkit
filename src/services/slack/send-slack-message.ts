import { Slack } from "src/types/slack";
import { SlackClient } from "~/clients";
import { getEnvVariable } from "~/utils";

const webhookUrl = getEnvVariable("SLACK_WEBHOOK_URL") || "";

/**
 * Slack にメッセージを送信するサービス関数。
 *
 * 指定されたペイロードを使用して、Slack Webhook 経由でメッセージを送信します。
 *
 * @param {Slack.MessagePayload} payload - Slack に送信するメッセージのペイロード。
 * @returns {Promise<void>} - メッセージ送信が完了すると解決される Promise。
 *
 * @throws {Error} - Webhook URL が無効な場合や、送信に失敗した場合にエラーをスローします。（例外処理は未確認）
 *
 * @example
 * ```ts
 * const payload: Slack.MessagePayload = {
 *   text: "通知メッセージ",
 *   blocks: [
 *     {
 *       type: "section",
 *       text: {
 *         type: "mrkdwn",
 *         text: "新しい通知があります。",
 *       },
 *     },
 *   ],
 * };
 * await sendSlackMessageService(payload);
 * ```
 */
export async function sendSlackMessageService(payload: Slack.MessagePayload) {
  const client = new SlackClient(webhookUrl);
  await client.send(payload);
}
