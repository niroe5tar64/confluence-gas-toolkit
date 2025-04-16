import { Slack } from "src/types/slack";
import { SlackClient } from "~/clients";

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
 * await sendSlackMessage(payload);
 * ```
 */
export async function sendSlackMessage(payload: Slack.MessagePayload) {
  const client = SlackClient.getInstance();
  await client.send(payload);
}

/**
 * Slack に例外情報を通知する関数。
 *
 * 指定されたエラーオブジェクトのメッセージを含むペイロードを生成し、
 * Slack Webhook 経由で通知を送信します。
 *
 * @param {Error} error - 通知する例外オブジェクト。
 *   - `error.message` が Slack メッセージとして送信されます。
 * @returns {Promise<void>} - メッセージ送信が完了すると解決される Promise。
 *
 * @throws {Error} - Webhook URL が無効な場合や、送信に失敗した場合にエラーをスローします。
 *
 * @example
 * ```ts
 * try {
 *   // 何らかの処理
 *   throw new Error("予期しないエラーが発生しました。");
 * } catch (error) {
 *   await sendSlackException(error);
 * }
 * ```
 */
export async function sendSlackException(error: Error) {
  const client = SlackClient.getInstance();
  const payload = {
    blocks: [
      {
        type: "section",
        fields: [{ type: "plain_text", text: error.message }],
      },
    ],
  };
  await client.send(payload);
}
