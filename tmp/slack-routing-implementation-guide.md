# Slack複数チャンネル対応 実装手順書

設計ドキュメント: `tmp/slack-routing-design.md`

---

## 前提条件

- 設計ドキュメントを読了していること
- `bun install` 済みであること

---

## 実装順序

依存関係を考慮した順序で実装してください。

```
Step 1: JobName型を拡張
    ↓
Step 2: slack-routes.ts を新規作成
    ↓
Step 3: SlackClient をレジストリパターンに変更
    ↓
Step 4: slack-message.ts に targetKey 引数を追加
    ↓
Step 5: use-case/* から targetKey を渡す
    ↓
Step 6: 環境変数を設定
```

---

## Step 1: JobName型を拡張

**ファイル**: `src/types/job.ts`

### Before (L1)
```typescript
export type JobName = "confluenceUpdateNotifyJob";
```

### After
```typescript
export type JobName =
  | "confluenceUpdateNotifyJob"
  | "confluenceUpdateSummaryJob";
```

> 将来 `confluenceCreateNotifyJob` を追加する場合も同様に追加

---

## Step 2: slack-routes.ts を新規作成

**ファイル**: `src/config/slack-routes.ts`（新規作成）

```typescript
import type { JobName } from "~/types";

/**
 * ジョブ名 → Slack送信先キーのマッピング
 * JobName に新しいジョブを追加した場合、ここに設定しないとコンパイルエラーになる
 */
export const SLACK_ROUTE: Record<JobName, string> = {
  confluenceUpdateNotifyJob: "update-notify",
  confluenceUpdateSummaryJob: "update-summary",
};
```

### ディレクトリ作成

```bash
mkdir -p src/config
```

### index.ts でエクスポート

**ファイル**: `src/config/index.ts`（新規作成）

```typescript
export { SLACK_ROUTE } from "./slack-routes";
```

### tsconfig.json にパスエイリアス追加

**ファイル**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "paths": {
      "~/config": ["./src/config"],
      "~/config/*": ["./src/config/*"],
      // 既存のパス...
    }
  }
}
```

### vite.config.ts にもエイリアス追加

```typescript
resolve: {
  alias: {
    "~/config": resolve(__dirname, "./src/config"),
    // 既存のエイリアス...
  },
},
```

---

## Step 3: SlackClient をレジストリパターンに変更

**ファイル**: `src/clients/slack-client.ts`

### Before (全体)
```typescript
import { getEnvVariable } from "~/utils";
import HttpClient from "./http-client";

export default class SlackClient extends HttpClient {
  private static instance: SlackClient | null = null;
  private webhookUrl: string;

  private constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

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

  async send(payload: object): Promise<boolean> {
    // ...省略
  }
}
```

### After
```typescript
import { getEnvVariable } from "~/utils";
import HttpClient from "./http-client";

// Webhook URL のキャッシュ
let webhookUrls: Record<string, string> | null = null;

/**
 * 環境変数から Webhook URL マッピングを取得
 * 後方互換: SLACK_WEBHOOK_URLS が未設定の場合は SLACK_WEBHOOK_URL を DEFAULT として扱う
 */
function getWebhookUrls(): Record<string, string> {
  if (!webhookUrls) {
    const raw = getEnvVariable("SLACK_WEBHOOK_URLS");
    if (raw) {
      webhookUrls = JSON.parse(raw);
    } else {
      // 後方互換: 旧環境変数を DEFAULT として扱う
      const legacyUrl = getEnvVariable("SLACK_WEBHOOK_URL");
      if (legacyUrl) {
        webhookUrls = { DEFAULT: legacyUrl };
      } else {
        throw new Error("SLACK_WEBHOOK_URLS が設定されていません");
      }
    }
  }
  return webhookUrls;
}

// クライアントインスタンスのレジストリ
const clients = new Map<string, SlackClient>();

/**
 * 指定されたターゲットキーに対応する SlackClient を取得
 * @param targetKey - SLACK_ROUTE で定義されたキー（例: "update-notify"）
 */
export function getSlackClient(targetKey: string): SlackClient {
  if (!clients.has(targetKey)) {
    const urls = getWebhookUrls();
    const url = urls[targetKey];
    if (!url) {
      throw new Error(`Webhook URL が見つかりません: ${targetKey}`);
    }
    clients.set(targetKey, new SlackClient(url));
  }
  return clients.get(targetKey)!;
}

export default class SlackClient extends HttpClient {
  private webhookUrl: string;

  /**
   * @deprecated 直接 new せず getSlackClient() を使用してください
   */
  constructor(webhookUrl: string) {
    super();
    this.webhookUrl = webhookUrl;
  }

  /**
   * @deprecated getSlackClient() を使用してください
   */
  public static getInstance(): SlackClient {
    return getSlackClient("DEFAULT");
  }

  /**
   * Slack にメッセージを送信
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
```

### clients/index.ts を更新

**ファイル**: `src/clients/index.ts`

```typescript
export { default as ConfluenceClient } from "./confluence-client";
export { default as SlackClient, getSlackClient } from "./slack-client";
```

---

## Step 4: slack-message.ts に targetKey 引数を追加

**ファイル**: `src/services/slack/slack-message.ts`

### Before
```typescript
import { SlackClient } from "~/clients";
import { Slack } from "~/types";

export async function sendSlackMessage(payload: Slack.MessagePayload) {
  const client = SlackClient.getInstance();
  await client.send(payload);
}

export async function sendSlackException(error: Error) {
  const client = SlackClient.getInstance();
  // ...
}
```

### After
```typescript
import { getSlackClient } from "~/clients";
import { Slack } from "~/types";

/**
 * Slack にメッセージを送信
 * @param payload - Slack メッセージペイロード
 * @param targetKey - 送信先キー（SLACK_ROUTE で定義）。省略時は "DEFAULT"
 */
export async function sendSlackMessage(
  payload: Slack.MessagePayload,
  targetKey = "DEFAULT"
) {
  const client = getSlackClient(targetKey);
  await client.send(payload);
}

/**
 * Slack に例外情報を通知
 * @param error - エラーオブジェクト
 * @param targetKey - 送信先キー。省略時は "DEFAULT"
 */
export async function sendSlackException(error: Error, targetKey = "DEFAULT") {
  const client = getSlackClient(targetKey);
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
```

---

## Step 5: use-case から targetKey を渡す

### confluence-update-notify-job.ts

**ファイル**: `src/use-case/confluence-update-notify-job.ts`

#### 変更1: import追加 (L1付近)
```typescript
import { SLACK_ROUTE } from "~/config";
```

#### 変更2: 定数追加 (関数の前)
```typescript
const TARGET_KEY = SLACK_ROUTE.confluenceUpdateNotifyJob;
```

#### 変更3: sendSlackException 呼び出し (L32付近)
```typescript
// Before
await sendSlackException(error);

// After
await sendSlackException(error, TARGET_KEY);
```

#### 変更4: sendSlackMessage 呼び出し (L55付近)
```typescript
// Before
await sendSlackMessage(payload);

// After
await sendSlackMessage(payload, TARGET_KEY);
```

---

### confluence-update-summary-job.ts

**ファイル**: `src/use-case/confluence-update-summary-job.ts`

#### 変更1: import追加 (L1付近)
```typescript
import { SLACK_ROUTE } from "~/config";
```

#### 変更2: 定数追加 (関数の前)
```typescript
const TARGET_KEY = SLACK_ROUTE.confluenceUpdateSummaryJob;
```

#### 変更3: sendSlackException 呼び出し (L17付近)
```typescript
// Before
await sendSlackException(error);

// After
await sendSlackException(error, TARGET_KEY);
```

#### 変更4: sendSlackMessage 呼び出し (L55付近)
```typescript
// Before
await sendSlackMessage(payload);

// After
await sendSlackMessage(payload, TARGET_KEY);
```

---

## Step 6: 環境変数を設定

### ローカル開発 (.env)

```env
# 新形式（JSON）
SLACK_WEBHOOK_URLS={"update-notify":"https://hooks.slack.com/services/XXX","update-summary":"https://hooks.slack.com/services/YYY","DEFAULT":"https://hooks.slack.com/services/ZZZ"}

# 旧形式（移行期間中は残しておく）
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/ZZZ
```

### GAS (Script Properties)

clasp push 前に GAS の「プロジェクトの設定」→「スクリプト プロパティ」で設定:

| プロパティ名 | 値 |
|-------------|-----|
| `SLACK_WEBHOOK_URLS` | `{"update-notify":"https://...","update-summary":"https://..."}` |

---

## 確認チェックリスト

### コンパイル確認
- [ ] `bun run build` が成功する
- [ ] TypeScript エラーがない

### Lint確認
- [ ] `bunx biome check .` が成功する

### テスト確認
- [ ] `bun test` が成功する
- [ ] 既存テストが壊れていない

### 動作確認（ローカル）
- [ ] `SLACK_WEBHOOK_URLS` 未設定時、`SLACK_WEBHOOK_URL` にフォールバックする
- [ ] `SLACK_WEBHOOK_URLS` 設定時、正しいチャンネルに送信される
- [ ] 存在しないキーを指定するとエラーになる

### 動作確認（GAS）
- [ ] `bun run push` でデプロイ成功
- [ ] トリガー実行で正しいチャンネルに通知される

---

## トラブルシューティング

### Q: パスエイリアス `~/config` が解決できない
→ `tsconfig.json` と `vite.config.ts` の両方にエイリアスを追加したか確認

### Q: JSON パースエラー
→ `SLACK_WEBHOOK_URLS` の JSON 形式を確認（特にエスケープ）

### Q: 既存機能が動かなくなった
→ `DEFAULT` キーが設定されているか、または `SLACK_WEBHOOK_URL`（旧形式）が残っているか確認

---

## 参考: ファイル変更一覧

| ファイル | 操作 | 内容 |
|----------|------|------|
| `src/types/job.ts` | 変更 | JobName 型を拡張 |
| `src/config/slack-routes.ts` | 新規 | ルーティング設定 |
| `src/config/index.ts` | 新規 | エクスポート |
| `tsconfig.json` | 変更 | パスエイリアス追加 |
| `vite.config.ts` | 変更 | パスエイリアス追加 |
| `src/clients/slack-client.ts` | 変更 | レジストリパターン |
| `src/clients/index.ts` | 変更 | getSlackClient エクスポート |
| `src/services/slack/slack-message.ts` | 変更 | targetKey 引数追加 |
| `src/use-case/confluence-update-notify-job.ts` | 変更 | targetKey を渡す |
| `src/use-case/confluence-update-summary-job.ts` | 変更 | targetKey を渡す |
| `.env` | 変更 | SLACK_WEBHOOK_URLS 追加 |
