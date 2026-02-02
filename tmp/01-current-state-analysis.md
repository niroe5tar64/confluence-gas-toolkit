# 現状分析: ログとエラーハンドリング

## 1. 現在のログ出力状況

### ログ出力箇所一覧

| ファイル | 行 | 種類 | 内容 |
|----------|-----|------|------|
| `src/clients/confluence-client.ts` | L179-181 | error | API呼び出し失敗時 |
| `src/clients/confluence-client.ts` | L225 | warn | rootPageIds が空の場合 |
| `src/utils/file.ts` | L46, 50 | log | Google Drive ファイル操作 |
| `src/use-case/confluence-update-notify-job.ts` | L27 | log | 実行スキップ時 |
| `src/use-case/confluence-update-summary-job.ts` | L51 | log | 変更なし時 |
| `src/use-case/confluence-update-summary-job.ts` | L96 | log | 初期化完了時 |

### 現状の問題点

- **デバッグログなし**: 開発時の問題追跡が困難
- **トレースログなし**: 処理フローの追跡ができない
- **専用ロギング機構なし**: ログレベルの切り替えができない
- **スタックトレース欠落**: エラー発生時の原因特定が困難

---

## 2. エラーハンドリングのパターン

### パターン1: use-case層での try-catch（Slack通知型）

```typescript
// confluence-update-notify-job.ts L31-37
export async function confluenceUpdateNotifyJob() {
  if (!isJobExecutionAllowed("confluenceUpdateNotifyJob")) {
    console.log("...");
    return;
  }

  try {
    await executeMainProcess();
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error, TARGET_KEY);  // Slackに例外通知
    }
    // 注意: 再スローしない（処理は沈黙終了）
  }
}
```

**該当箇所:**
- `confluence-update-notify-job.ts` L31-37
- `confluence-create-notify-job.ts` L24-29
- `confluence-update-summary-job.ts` L16-22

### パターン2: クライアント層での例外発生（再スロー型）

```typescript
// confluence-client.ts L163-185
async callApi<T>(...): Promise<T> {
  try {
    const response = await this.httpRequest(...);
    // HTTPエラーチェック
    if (response.status >= 400) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return this.deepTransform(json) as T;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Fetch failed:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    throw error;  // 上位層で処理するため再スロー
  }
}
```

### パターン3: ファイルI/O（黙殺型）

```typescript
// job-data.ts L64-70
export function parseJobData(fileName: JobDataFileName): JobData | null {
  try {
    const jobData = readFile(`${IO_CONFIG.dataDir}/${fileName}`);
    return isJobData(jobData) ? jobData : null;
  } catch (_error) {
    return null;  // エラー内容を検証しない
  }
}
```

### エラーハンドリングの問題点

| 問題 | 箇所 | 影響 |
|------|------|------|
| スタックトレース欠落 | use-case層 | 原因特定困難 |
| 非Error例外の未処理 | 複数箇所 | 予期しない例外が握りつぶされる |
| Slack通知への情報欠落 | slack-message.ts L60-71 | error.message のみ送信 |
| ファイルI/O無音失敗 | job-data.ts L68 | デバッグ困難 |

---

## 3. 外部API通信箇所

### Confluence API

**エンドポイント:**
- `GET /rest/api/content/{pageId}` - 単一ページ取得
- `GET /rest/api/content/search?cql=...` - ページ検索（主に使用）

**認証:** Bearer Token (Personal Access Token)

**ページネーション処理:**
```typescript
// recent-changes.ts L44-52
let nextEndpoint = searchPages._links?.next;
while (nextEndpoint) {
  const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint, jobName);
  searchResults = [...searchResults, ...nextPages.results];
  nextEndpoint = nextPages._links?.next;
}
```

**CQL例:**
```
type=page AND space=SPACE_A AND
(ancestor=12345 OR ancestor=23456) AND
lastModified > '2025/02/03 14:30' ORDER BY lastModified DESC
```

### Slack API

**方式:** Incoming Webhook (POST)

**ペイロード形式:** Block Kit (JSON)

---

## 4. 問題が起きやすい箇所

### 優先度: 高

| 箇所 | ファイル | リスク |
|------|----------|--------|
| ページネーション終了判定 | recent-changes.ts L44-52 | 大量データ時のタイムアウト |
| タイムスタンプ変換 | recent-changes.ts L38 | タイムゾーン不一致で検索漏れ |
| Slack例外通知 | slack-message.ts L60-71 | スタックトレース欠落 |

### 優先度: 中

| 箇所 | ファイル | リスク |
|------|----------|--------|
| ジョブ実行時間判定 | job-execution-check.ts L54-67 | endHour境界の挙動が曖昧 |
| ファイルI/Oエラー | job-data.ts L64-70 | 権限不足時の検知遅延 |
| 複数rootPageIds | confluence-client.ts L234-238 | 設定ミスで意図しないページが対象に |

### 優先度: 低

| 箇所 | ファイル | リスク |
|------|----------|--------|
| 深い型変換 | http-client.ts L106-139 | 深いネストでパフォーマンス劣化 |
| 再帰処理 | http-client.ts L121-134 | 極端なケースでスタックオーバーフロー |

---

## 5. 処理フロー図

```
[GAS Trigger / ローカル実行]
    │
    ▼
[use-case/job]
    │
    ├─ isJobExecutionAllowed() ─→ スキップ時は早期リターン
    │
    ├─ parseJobData() ─→ 前回タイムスタンプ取得
    │
    ├─ fetchRecentChanges() ─┬→ [Confluence API] 検索
    │                        └→ ページネーション処理
    │
    ├─ convertSearchResultToMessagePayload() ─→ Slack形式に変換
    │
    ├─ sendSlackMessage() ─→ [Slack Webhook] 送信
    │
    └─ updateJobData() ─→ タイムスタンプ保存
```

---

## 6. 設定ファイル一覧

| ファイル | 用途 | 環境対応 |
|---------|------|---------|
| `confluence-page-configs.ts` | 監視対象ページ設定 | dev/prod |
| `job-schedule.ts` | ジョブ実行時間帯設定 | 共通 |
| `slack-routes.ts` | Slack Webhook ルーティング | 共通 |
| `slack-messages.ts` | 通知メッセージ文言 | dev/prod |
| `io-config.ts` | ジョブ状態保存先ディレクトリ | dev/prod |

**必須環境変数:**
- `CONFLUENCE_URL` - Confluence ベース URL
- `CONFLUENCE_PAT` - Personal Access Token
- `SLACK_WEBHOOK_URLS` - Slack Webhook URL マッピング（JSON）
- `APP_ENV` - "dev" または "prod"
- `TARGET` - "GAS" で GAS環境判定
