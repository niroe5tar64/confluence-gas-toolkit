import HttpClient from "./http-client";

export default class SlackClient extends HttpClient {
  private webhookUrl: string;

  /**
   * Slack クライアントを初期化
   * @param {string} webhookUrl - Slack Webhook URL
   */
  constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
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
