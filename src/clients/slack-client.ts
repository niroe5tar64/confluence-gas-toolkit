import { getEnvVariable } from "~/utils";

import HttpClient from "./http-client";

export default class SlackClient extends HttpClient {
  private static instance: SlackClient | null = null;

  private webhookUrl: string;

  /**
   * Slack クライアントを初期化
   * @param {string} webhookUrl - Slack Webhook URL
   */
  private constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  /**
   * SlackClient のシングルトンインスタンスを取得する。
   *
   * 初回呼び出し時にインスタンスを生成し、以降は同じインスタンスを返す。
   * 環境変数から必要な設定値を取得してインスタンスを初期化する。
   *
   * @returns {SlackClient} - SlackClient のシングルトンインスタンス
   * @throws {Error} - SLACK_WEBHOOK_URL 環境変数が設定されていない場合にスローされる
   */
  public static getInstance(): SlackClient {
    if (!SlackClient.instance) {
      const webhookUrl = getEnvVariable("SLACK_WEBHOOK_URL") || "";
      if (!webhookUrl) {
        throw new Error("SLACK_WEBHOOK_URL 環境変数が設定されていません。");
      }
      SlackClient.instance = new SlackClient(webhookUrl);
    }
    return SlackClient.instance;
  }

  /**
   * Slack にカスタマイズ可能なメッセージを送信する
   * @param {object} payload - Slack メッセージのペイロード
   * @returns {Promise<boolean>} - 送信成功時に `true` を返す
   */
  async send(payload: object): Promise<boolean> {
    try {
      await this.httpRequest(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return true;
    } catch (error) {
      console.error("Slack メッセージ送信エラー:", error);
      return false;
    }
  }
}
