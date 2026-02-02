# ログ設計案

## 1. Loggerクラスの設計

### 基本仕様

```typescript
// src/utils/logger.ts

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// ログレベルの優先度（数値が大きいほど優先度が高い）
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  private static globalLevel: LogLevel = "INFO";
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  // 環境変数からログレベルを設定
  static initialize(): void {
    const level = getEnvVariable("LOG_LEVEL");
    if (level && isValidLogLevel(level)) {
      Logger.globalLevel = level;
    }
  }

  debug(message: string, data?: object): void;
  info(message: string, data?: object): void;
  warn(message: string, data?: object): void;
  error(message: string, error?: Error, data?: object): void;
}

// ファクトリ関数
export function createLogger(context: string): Logger {
  return new Logger(context);
}
```

### 出力フォーマット

```
[2025-02-03T14:30:00+09:00] [INFO] [ConfluenceClient] GET /rest/api/content/search - 25件取得
[2025-02-03T14:30:01+09:00] [ERROR] [Job] 処理失敗: HTTP Error 401
  Stack: Error: HTTP Error 401
    at ConfluenceClient.callApi (confluence-client.ts:175)
    at fetchRecentChanges (recent-changes.ts:42)
    ...
```

### 環境変数

| 変数名 | 値 | デフォルト | 説明 |
|--------|-----|----------|------|
| `LOG_LEVEL` | DEBUG / INFO / WARN / ERROR | INFO | 出力するログの最低レベル |

---

## 2. ログ出力箇所の詳細設計

### 2.1 API通信層（clients/）

#### ConfluenceClient

| メソッド/箇所 | レベル | メッセージ例 | data |
|---------------|--------|-------------|------|
| callApi 開始 | DEBUG | `リクエスト送信` | `{ method, endpoint }` |
| callApi 成功 | DEBUG | `レスポンス受信` | `{ status, resultCount? }` |
| callApi 失敗 | ERROR | `API呼び出し失敗` | `{ method, endpoint, status }` + Error |
| getSearchPage（空rootPageIds） | WARN | `rootPageIdsが空のため処理スキップ` | - |

#### ページネーション処理（recent-changes.ts）

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| ページ取得 | DEBUG | `ページネーション` | `{ page, cumulative, hasNext }` |
| 完了 | INFO | `検索完了` | `{ totalCount, pageCount }` |

#### SlackClient

| メソッド/箇所 | レベル | メッセージ例 | data |
|---------------|--------|-------------|------|
| send 開始 | DEBUG | `メッセージ送信開始` | `{ targetKey }` |
| send 成功 | INFO | `メッセージ送信完了` | `{ targetKey }` |
| send 失敗 | ERROR | `メッセージ送信失敗` | `{ targetKey, status }` + Error |

---

### 2.2 ジョブ実行層（use-case/）

#### 共通パターン

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| ジョブ開始 | INFO | `ジョブ開始` | `{ jobName }` |
| 実行時間外スキップ | INFO | `実行時間外のためスキップ` | `{ jobName, currentTime }` |
| 検索範囲 | DEBUG | `検索範囲設定` | `{ since, jobName }` |
| 検出結果 | INFO | `変更検出` | `{ count, jobName }` |
| 変更なし | INFO | `変更なし` | `{ jobName }` |
| ジョブ完了 | INFO | `ジョブ完了` | `{ jobName, duration, processedCount }` |
| ジョブ失敗 | ERROR | `ジョブ失敗` | `{ jobName }` + Error（スタックトレース付き） |

---

### 2.3 サービス層（services/）

#### confluence/recent-changes.ts

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| CQL生成 | DEBUG | `CQL生成` | `{ cql }` |

#### confluence-slack/message-payload.ts

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| 変換 | DEBUG | `ペイロード変換` | `{ pageId, pageTitle }` |

#### io/job-data.ts

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| 読み込み成功 | DEBUG | `ジョブデータ読み込み成功` | `{ fileName }` |
| 読み込み失敗 | WARN | `ジョブデータ読み込み失敗、デフォルト値を使用` | `{ fileName, reason }` |
| 書き込み成功 | DEBUG | `ジョブデータ書き込み成功` | `{ fileName }` |
| 書き込み失敗 | ERROR | `ジョブデータ書き込み失敗` | `{ fileName }` + Error |

#### scheduler/job-execution-check.ts

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| 判定結果 | DEBUG | `実行可否判定` | `{ jobName, allowed, currentDay, currentHour }` |

---

### 2.4 初期化・設定

#### クライアント初期化

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| Logger初期化 | INFO | `Logger初期化` | `{ level, env }` |
| ConfluenceClient初期化 | DEBUG | `ConfluenceClient初期化` | `{ spaceKey, rootPageCount }` |
| SlackClient初期化 | DEBUG | `SlackClient初期化` | `{ targetKey }` |

#### 設定エラー

| 箇所 | レベル | メッセージ例 | data |
|------|--------|-------------|------|
| 環境変数未設定 | ERROR | `必須環境変数未設定` | `{ missing: ["CONFLUENCE_PAT"] }` |
| 設定形式エラー | ERROR | `設定形式エラー` | `{ configName, reason }` |

---

## 3. エラーログの改善

### 現状

```typescript
// slack-message.ts L60-71
export async function sendSlackException(error: Error, targetKey = "DEFAULT") {
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

### 改善案

```typescript
export async function sendSlackException(
  error: Error,
  targetKey: string,
  context?: { jobName?: string; stage?: string }
) {
  const logger = createLogger("SlackException");

  // コンソールログにはスタックトレースを完全出力
  logger.error("例外発生", error, context);

  // Slackにはメッセージ + コンテキスト + スタックの先頭数行
  const stackLines = error.stack?.split("\n").slice(0, 5).join("\n") ?? "";
  const payload = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "エラー発生" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Job:* ${context?.jobName ?? "不明"}` },
          { type: "mrkdwn", text: `*Stage:* ${context?.stage ?? "不明"}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `\`\`\`${error.message}\n${stackLines}\`\`\`` },
      },
    ],
  };
  await client.send(payload);
}
```

---

## 4. 実装の優先度

### Phase 1: 基盤（必須）
1. `src/utils/logger.ts` - Loggerクラス作成
2. 環境変数 `LOG_LEVEL` の追加

### Phase 2: エラー追跡（重要）
3. use-case層のエラーログ改善（スタックトレース）
4. `sendSlackException` の改善

### Phase 3: API通信（重要）
5. ConfluenceClient のログ追加
6. SlackClient のログ追加
7. ページネーション処理のログ追加

### Phase 4: 詳細トレース（任意）
8. サービス層のDEBUGログ追加
9. 初期化処理のログ追加

---

## 5. 注意事項

### セキュリティ
- **トークンやWebhook URLをログに出力しない**
- エンドポイントURLは出力可（認証情報は含まない）

### パフォーマンス
- DEBUGレベルのログはデータ量が多くなる可能性
- 本番環境では `LOG_LEVEL=INFO` を推奨

### GAS環境の制約
- GASの実行ログは Apps Script ダッシュボードで確認
- ログの保持期間に制限あり
- 重要なエラーは引き続きSlack通知を維持
