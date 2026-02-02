# ログ機能 実装ガイド

このドキュメントはCodex等のAIエージェントが実装を完遂するための詳細ガイドです。

## 前提条件

- `01-current-state-analysis.md` で現状を把握済み
- `02-logging-design-proposal.md` で設計方針を把握済み

---

## Phase 1: Loggerクラス作成

### 1.1 新規ファイル作成: `src/utils/logger.ts`

```typescript
import { getEnvVariable } from "~/utils/env";

// ログレベルの型定義
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// ログレベルの優先度（数値が大きいほど優先度が高い）
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 有効なログレベルかどうかを判定
function isValidLogLevel(level: string): level is LogLevel {
  return level in LOG_LEVEL_PRIORITY;
}

// タイムスタンプをISO 8601形式（JST）で取得
function getTimestamp(): string {
  const now = new Date();
  const offset = 9 * 60; // JST = UTC+9
  const jst = new Date(now.getTime() + offset * 60 * 1000);
  return jst.toISOString().replace("Z", "+09:00");
}

/**
 * ロガークラス
 *
 * 環境変数 LOG_LEVEL でログ出力レベルを制御可能
 * - DEBUG: すべてのログを出力
 * - INFO: INFO, WARN, ERROR を出力（デフォルト）
 * - WARN: WARN, ERROR を出力
 * - ERROR: ERROR のみ出力
 */
export class Logger {
  private static globalLevel: LogLevel = "INFO";
  private static initialized = false;
  private context: string;

  constructor(context: string) {
    this.context = context;
    // 初回のみ初期化
    if (!Logger.initialized) {
      Logger.initialize();
    }
  }

  /**
   * 環境変数からログレベルを設定
   * 無効な値が指定された場合はデフォルト（INFO）を使用し、警告を出力
   */
  static initialize(): void {
    if (Logger.initialized) {
      return;
    }

    const level = getEnvVariable("LOG_LEVEL");
    if (level) {
      if (isValidLogLevel(level)) {
        Logger.globalLevel = level;
      } else {
        console.warn(
          `[Logger] 無効なLOG_LEVEL "${level}" が指定されました。デフォルト "INFO" を使用します。`
        );
      }
    }
    Logger.initialized = true;
  }

  /**
   * 指定レベルのログを出力すべきか判定
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[Logger.globalLevel];
  }

  /**
   * ログメッセージをフォーマット
   */
  private formatMessage(level: LogLevel, message: string, data?: object): string {
    const timestamp = getTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  /**
   * DEBUGレベルのログを出力
   */
  debug(message: string, data?: object): void {
    if (this.shouldLog("DEBUG")) {
      console.log(this.formatMessage("DEBUG", message, data));
    }
  }

  /**
   * INFOレベルのログを出力
   */
  info(message: string, data?: object): void {
    if (this.shouldLog("INFO")) {
      console.log(this.formatMessage("INFO", message, data));
    }
  }

  /**
   * WARNレベルのログを出力
   */
  warn(message: string, data?: object): void {
    if (this.shouldLog("WARN")) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  /**
   * ERRORレベルのログを出力
   * エラーオブジェクトが渡された場合はスタックトレースも出力
   */
  error(message: string, error?: Error, data?: object): void {
    if (this.shouldLog("ERROR")) {
      const formattedMessage = this.formatMessage("ERROR", message, data);
      console.error(formattedMessage);
      if (error?.stack) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  /**
   * 現在のログレベルを取得（テスト用）
   */
  static getLevel(): LogLevel {
    return Logger.globalLevel;
  }

  /**
   * ログレベルをリセット（テスト用）
   */
  static reset(): void {
    Logger.globalLevel = "INFO";
    Logger.initialized = false;
  }
}

/**
 * Loggerインスタンスを作成するファクトリ関数
 * @param context ログの出力元を識別する文字列（例: "ConfluenceClient", "JobData"）
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
```

### 1.2 エクスポート追加: `src/utils/index.ts`

既存ファイルに以下を追加:

```typescript
export { Logger, createLogger, type LogLevel } from "./logger";
```

### 1.3 テスト作成: `src/utils/logger.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { Logger, createLogger } from "./logger";

describe("Logger", () => {
  beforeEach(() => {
    Logger.reset();
  });

  afterEach(() => {
    Logger.reset();
  });

  describe("ログレベル制御", () => {
    test("デフォルトはINFOレベル", () => {
      expect(Logger.getLevel()).toBe("INFO");
    });

    test("DEBUGレベルではすべてのログが出力される", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("Test");
      const consoleSpy = mock(() => {});
      console.log = consoleSpy;

      logger.debug("test message");

      expect(consoleSpy).toHaveBeenCalled();

      delete process.env.LOG_LEVEL;
    });

    test("INFOレベルではDEBUGログは出力されない", () => {
      process.env.LOG_LEVEL = "INFO";
      Logger.reset();

      const logger = createLogger("Test");
      const consoleSpy = mock(() => {});
      console.log = consoleSpy;

      logger.debug("test message");

      expect(consoleSpy).not.toHaveBeenCalled();

      delete process.env.LOG_LEVEL;
    });

    test("無効なLOG_LEVELはINFOにフォールバック", () => {
      process.env.LOG_LEVEL = "INVALID";
      const warnSpy = mock(() => {});
      console.warn = warnSpy;

      Logger.reset();
      createLogger("Test");

      expect(Logger.getLevel()).toBe("INFO");
      expect(warnSpy).toHaveBeenCalled();

      delete process.env.LOG_LEVEL;
    });
  });

  describe("出力フォーマット", () => {
    test("contextがログに含まれる", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("TestContext");
      let output = "";
      console.log = (msg: string) => {
        output = msg;
      };

      logger.info("test message");

      expect(output).toContain("[TestContext]");
      expect(output).toContain("[INFO]");
      expect(output).toContain("test message");

      delete process.env.LOG_LEVEL;
    });

    test("dataオブジェクトがJSON形式で出力される", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("Test");
      let output = "";
      console.log = (msg: string) => {
        output = msg;
      };

      logger.info("test", { key: "value" });

      expect(output).toContain('{"key":"value"}');

      delete process.env.LOG_LEVEL;
    });
  });

  describe("エラーログ", () => {
    test("スタックトレースが出力される", () => {
      const logger = createLogger("Test");
      const outputs: string[] = [];
      console.error = (msg: string) => {
        outputs.push(msg);
      };

      const error = new Error("test error");
      logger.error("エラー発生", error);

      expect(outputs.length).toBe(2);
      expect(outputs[0]).toContain("[ERROR]");
      expect(outputs[1]).toContain("Stack:");

      delete process.env.LOG_LEVEL;
    });
  });
});
```

---

## Phase 2: エラー追跡の改善

### 2.1 変更: `src/services/slack/slack-message.ts`

**変更箇所:** `sendSlackException` 関数

**Before (L60-71付近):**
```typescript
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

**After:**
```typescript
import { createLogger } from "~/utils/logger";

export async function sendSlackException(
  error: Error,
  targetKey: string,
  context?: { jobName?: string; stage?: string }
) {
  const logger = createLogger("SlackException");

  // コンソールログにはスタックトレースを完全出力
  logger.error("例外発生", error, context);

  const client = getSlackClient(targetKey);

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

### 2.2 変更: `src/use-case/confluence-update-notify-job.ts`

**変更箇所:** try-catch ブロックと関数全体

**Before (L24-38付近):**
```typescript
export async function confluenceUpdateNotifyJob() {
  if (!isJobExecutionAllowed("confluenceUpdateNotifyJob")) {
    console.log(
      "'confluenceUpdateNotifyJob' は実行可能な時間ではないので、処理を中断しました。"
    );
    return;
  }

  try {
    await executeMainProcess();
  } catch (error: unknown) {
    if (error instanceof Error) {
      await sendSlackException(error, TARGET_KEY);
    }
  }
}
```

**After:**
```typescript
import { createLogger } from "~/utils/logger";

const logger = createLogger("UpdateNotifyJob");

export async function confluenceUpdateNotifyJob() {
  const jobName = "confluenceUpdateNotifyJob";
  logger.info("ジョブ開始", { jobName });

  if (!isJobExecutionAllowed(jobName)) {
    logger.info("実行時間外のためスキップ", {
      jobName,
      currentTime: new Date().toISOString(),
    });
    return;
  }

  try {
    await executeMainProcess();
    logger.info("ジョブ完了", { jobName });
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error("ジョブ失敗", error, { jobName });
      await sendSlackException(error, TARGET_KEY, { jobName });
    }
  }
}
```

### 2.3 変更: `src/use-case/confluence-create-notify-job.ts`

**同様のパターンで変更:**
- `createLogger("CreateNotifyJob")` を使用
- ジョブ開始/完了/失敗のログを追加
- `sendSlackException` に context を渡す

### 2.4 変更: `src/use-case/confluence-update-summary-job.ts`

**同様のパターンで変更:**
- `createLogger("UpdateSummaryJob")` を使用
- ジョブ開始/完了/失敗のログを追加
- `sendSlackException` に context を渡す

### 2.5 変更: `src/services/io/job-data.ts`

**変更箇所:** `parseJobData` 関数と `updateJobData` 関数

**parseJobData - Before (L64-70付近):**
```typescript
export function parseJobData(fileName: JobDataFileName): JobData | null {
  try {
    const jobData = readFile(`${IO_CONFIG.dataDir}/${fileName}`);
    return isJobData(jobData) ? jobData : null;
  } catch (_error) {
    return null;
  }
}
```

**parseJobData - After:**
```typescript
import { createLogger } from "~/utils/logger";

const logger = createLogger("JobData");

export function parseJobData(fileName: JobDataFileName): JobData | null {
  const filePath = `${IO_CONFIG.dataDir}/${fileName}`;

  try {
    const jobData = readFile(filePath);

    if (!isJobData(jobData)) {
      logger.warn("ジョブデータ形式不正、デフォルト値を使用", {
        fileName,
        reason: "invalid format",
      });
      return null;
    }

    logger.debug("ジョブデータ読み込み成功", {
      fileName,
      timestamp: jobData.timestamp,
    });
    return jobData;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    logger.warn("ジョブデータ読み込み失敗、デフォルト値を使用", {
      fileName,
      reason,
    });
    return null;
  }
}
```

**updateJobData - Before (L36-40付近):**
```typescript
export function updateJobData(fileName: JobDataFileName, jobData: JobData) {
  writeFile(`${IO_CONFIG.dataDir}/${fileName}`, JSON.stringify(jobData, null, 2));
}
```

**updateJobData - After:**
```typescript
export function updateJobData(fileName: JobDataFileName, jobData: JobData) {
  try {
    writeFile(`${IO_CONFIG.dataDir}/${fileName}`, JSON.stringify(jobData, null, 2));
    logger.debug("ジョブデータ書き込み成功", {
      fileName,
      timestamp: jobData.timestamp,
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error("ジョブデータ書き込み失敗", error, {
        fileName,
        timestamp: jobData.timestamp,
      });
    }
    throw error; // 上位で処理するため再スロー
  }
}
```

---

## Phase 3: API通信のログ追加

### 3.1 変更: `src/clients/confluence-client.ts`

**変更箇所:** クラス全体に logger を追加

**追加するimport:**
```typescript
import { createLogger } from "~/utils/logger";
```

**クラス内に追加:**
```typescript
export class ConfluenceClient extends HttpClient {
  private logger = createLogger("ConfluenceClient");
  // ... 既存のプロパティ
```

**コンストラクタの末尾に追加:**
```typescript
constructor(...) {
  // ... 既存の処理

  this.logger.debug("ConfluenceClient初期化", {
    spaceKey: this.spaceKey,
    rootPageIds: this.rootPageIds,
    rootPageCount: this.rootPageIds.length,
  });
}
```

**callApi メソッドの変更 (L163-185付近):**

**Before:**
```typescript
async callApi<T>(...): Promise<T> {
  // ...
  try {
    const response = await this.httpRequest(...);
    // ...
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Fetch failed:", error.message);
    } else {
      console.error("Unexpected error:", error);
    }
    throw error;
  }
}
```

**After:**
```typescript
async callApi<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  requestBody?: string | Record<string, string | number | boolean> | Blob,
): Promise<T> {
  this.logger.debug("リクエスト送信", { method, endpoint });

  // ... 既存の処理

  try {
    const response = await this.httpRequest(...);
    const json = await this.responseToJson(response);

    // HTTPエラーチェック（既存コード）
    // ...

    this.logger.debug("レスポンス受信", {
      method,
      endpoint,
      status: "status" in response ? response.status : response.getResponseCode(),
    });

    return this.deepTransform(json) as T;
  } catch (error: unknown) {
    const status = "不明";
    this.logger.error("API呼び出し失敗", error instanceof Error ? error : undefined, {
      method,
      endpoint,
      status,
    });
    throw error;
  }
}
```

**getSearchPage メソッドの変更 (L220-250付近):**

**Before:**
```typescript
if (this.rootPageIds.length === 0) {
  console.warn("rootPageIds が空のため、処理をスキップします");
  return { _links: {}, results: [], start: 0, limit: 0, size: 0 };
}
```

**After:**
```typescript
if (this.rootPageIds.length === 0) {
  this.logger.warn("rootPageIdsが空のため処理スキップ", {
    spaceKey: this.spaceKey,
  });
  return { _links: {}, results: [], start: 0, limit: 0, size: 0 };
}
```

### 3.2 変更: `src/clients/slack-client.ts`

**追加するimport:**
```typescript
import { createLogger } from "~/utils/logger";
```

**クラス内に追加:**
```typescript
export class SlackClient extends HttpClient {
  private logger = createLogger("SlackClient");
  // ... 既存のプロパティ
```

**send メソッドの変更 (L98-118付近):**

**Before:**
```typescript
async send(payload: object): Promise<void> {
  const response = await this.httpRequest(this.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if ("ok" in response) {
    if (!response.ok) {
      throw new Error(`Slack送信失敗: ${response.status} ${response.statusText}`.trim());
    }
    return;
  }
  // ...
}
```

**After:**
```typescript
async send(payload: object, payloadSummary?: { type?: string; pageCount?: number; firstPageTitle?: string }): Promise<void> {
  this.logger.debug("メッセージ送信開始", { targetKey: this.targetKey });

  try {
    const response = await this.httpRequest(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if ("ok" in response) {
      if (!response.ok) {
        const error = new Error(`Slack送信失敗: ${response.status} ${response.statusText}`.trim());
        this.logger.error("メッセージ送信失敗", error, {
          targetKey: this.targetKey,
          status: response.status,
          payloadSummary,
        });
        throw error;
      }
      this.logger.info("メッセージ送信完了", { targetKey: this.targetKey });
      return;
    }

    if ("getResponseCode" in response) {
      const status = response.getResponseCode();
      if (status >= 400) {
        const error = new Error(`Slack送信失敗: ${status}`);
        this.logger.error("メッセージ送信失敗", error, {
          targetKey: this.targetKey,
          status,
          payloadSummary,
        });
        throw error;
      }
      this.logger.info("メッセージ送信完了", { targetKey: this.targetKey });
    }
  } catch (error) {
    if (error instanceof Error && !error.message.startsWith("Slack送信失敗")) {
      this.logger.error("メッセージ送信失敗", error, {
        targetKey: this.targetKey,
        payloadSummary,
      });
    }
    throw error;
  }
}
```

### 3.3 変更: `src/services/confluence/recent-changes.ts`

**追加するimport:**
```typescript
import { createLogger } from "~/utils/logger";
```

**関数内に追加:**
```typescript
export async function fetchRecentChanges(...) {
  const logger = createLogger("RecentChanges");

  // ... 既存の処理

  // CQL生成後に追加
  logger.debug("検索開始", { cql: extraCql, rootPageIds: client.rootPageIds });

  // ページネーションループ内に追加
  let pageCount = 1;
  let searchResults = searchPages.results;
  let nextEndpoint = searchPages._links?.next;

  while (nextEndpoint) {
    pageCount++;
    const nextPages = await fetchConfluenceApi<Confluence.SearchPage>(nextEndpoint, jobName);
    const fetchedCount = nextPages.results.length;
    searchResults = [...searchResults, ...nextPages.results];

    logger.debug("ページネーション", {
      page: pageCount,
      fetchedCount,
      cumulative: searchResults.length,
      hasNext: !!nextPages._links?.next,
    });

    nextEndpoint = nextPages._links?.next;
  }

  // 検索完了後に追加
  logger.info("検索完了", {
    totalCount: searchResults.length,
    pageCount,
  });

  return searchResults;
}
```

---

## Phase 4: 詳細トレース（任意）

Phase 4 は必要に応じて実装。基本的な問題追跡は Phase 1-3 で可能。

---

## 既存ログの扱い

### 置き換え対象

| ファイル | 既存コード | 置き換え |
|----------|-----------|---------|
| `confluence-client.ts` L179-181 | `console.error("Fetch failed:", ...)` | `logger.error(...)` に置き換え |
| `confluence-client.ts` L225 | `console.warn("rootPageIds が空...")` | `logger.warn(...)` に置き換え |
| `confluence-update-notify-job.ts` L27 | `console.log("...は実行可能な時間ではない...")` | `logger.info(...)` に置き換え |
| `confluence-update-summary-job.ts` L51 | `console.log("最近の変更はありません。")` | `logger.info(...)` に置き換え |
| `confluence-update-summary-job.ts` L96 | `console.log("サマリー生成用データを初期化しました。")` | `logger.info(...)` に置き換え |

### 残す対象

| ファイル | 既存コード | 理由 |
|----------|-----------|------|
| `file.ts` L46, 50 | `console.log("File updated/created in Drive: ...")` | Google Drive操作の確認用。必要なら後で置き換え |

---

## 実装順序チェックリスト

### Phase 1
- [ ] `src/utils/logger.ts` を新規作成
- [ ] `src/utils/index.ts` にエクスポート追加
- [ ] `src/utils/logger.test.ts` を作成してテスト実行
- [ ] `bun test` で全テストがパスすることを確認

### Phase 2
- [ ] `src/services/slack/slack-message.ts` の `sendSlackException` を変更
- [ ] `src/use-case/confluence-update-notify-job.ts` を変更
- [ ] `src/use-case/confluence-create-notify-job.ts` を変更
- [ ] `src/use-case/confluence-update-summary-job.ts` を変更
- [ ] `src/services/io/job-data.ts` の `parseJobData` と `updateJobData` を変更
- [ ] `bun test` で全テストがパスすることを確認

### Phase 3
- [ ] `src/clients/confluence-client.ts` にログ追加
- [ ] `src/clients/slack-client.ts` にログ追加
- [ ] `src/services/confluence/recent-changes.ts` にログ追加
- [ ] `bun test` で全テストがパスすることを確認
- [ ] `bunx biome check .` でLintエラーがないことを確認

---

## 動作確認方法

### ローカル環境でのテスト

```bash
# ログレベルをDEBUGにして実行
LOG_LEVEL=DEBUG bun run src/index.ts

# ログレベルをINFOにして実行（デフォルト）
bun run src/index.ts

# 無効なログレベルを指定（警告が出ることを確認）
LOG_LEVEL=INVALID bun run src/index.ts
```

### 確認ポイント

1. **Phase 1 完了後:**
   - `LOG_LEVEL=DEBUG` でDEBUGログが出力される
   - `LOG_LEVEL=INFO` でDEBUGログが出力されない
   - 無効な `LOG_LEVEL` で警告が出る

2. **Phase 2 完了後:**
   - ジョブ開始/完了がINFOログで出力される
   - エラー発生時にスタックトレースが出力される
   - Slack通知にJob名とStageが含まれる

3. **Phase 3 完了後:**
   - API呼び出しがDEBUGログで出力される
   - 検索完了がINFOログで出力される（件数含む）
   - Slack送信完了がINFOログで出力される
