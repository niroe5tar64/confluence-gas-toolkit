import { SLACK_ROUTE } from "~/config";
import { sendSlackException, sendSlackMessage } from "~/services";

const TARGET_KEY = SLACK_ROUTE.confluenceCreateNotifyJob;

/**
 * ページ新規作成時の通知ジョブ
 * TODO: 具体的な実装は別途定義
 */
export async function confluenceCreateNotifyJob() {
  try {
    // TODO: 新規作成ページの取得・通知ロジックを実装
    const payload = { text: "新規ページが作成されました" };
    await sendSlackMessage(payload, TARGET_KEY);
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error, TARGET_KEY);
    }
  }
}
