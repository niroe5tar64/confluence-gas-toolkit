# プロジェクト修正作業手順書

対象: Codex
作成日: 2026-01-29
参照: `tmp/comprehensive-review-report.md`

---

## 進捗チェックリスト

### 🔴 Critical（必須）
- [x] Task 1: タイムスタンプ判定バグの修正
- [x] Task 2: await 忘れの修正

### 🟠 High（重要）
- [x] Task 3: diff URL パラメータの修正
- [x] Task 4: Slack 送信エラーハンドリング改善
- [x] Task 5: rootPageIds 空配列チェック追加
- [x] Task 6: 環境変数バリデーション追加

### 🟡 Medium（推奨）
- [ ] Task 7: 型定義の重複解消
- [ ] Task 8: 未実装ジョブの削除または実装
- [ ] Task 9: 廃止 API の削除

---

## 作業手順

---

### Task 1: タイムスタンプ判定バグの修正

**優先度**: 🔴 Critical
**影響**: CQL クエリが不正になり、検索失敗の恐れ

#### 修正対象ファイル
1. `src/use-case/confluence-update-notify-job.ts`
2. `src/use-case/confluence-update-summary-job.ts`

#### 修正内容

**問題のコード（両ファイル共通パターン）**:
```typescript
const lastChecked = new Date(timestamp);
if (Number.isNaN(lastChecked)) {
  // このブロックは決して実行されない
}
```

**修正後**:
```typescript
const lastChecked = new Date(timestamp);
if (Number.isNaN(lastChecked.getTime())) {
  // 正しく判定される
}
```

#### 作業手順
1. `src/use-case/confluence-update-notify-job.ts` を開く
2. 41-46行目付近の `Number.isNaN(lastChecked)` を `Number.isNaN(lastChecked.getTime())` に修正
3. `src/use-case/confluence-update-summary-job.ts` を開く
4. 38-42行目付近の同様の箇所を修正
5. `bun test` でテスト実行

#### 確認方法
- 無効なタイムスタンプ（例: `"invalid"`）を渡した場合にフォールバックが効くことを確認

---

### Task 2: await 忘れの修正

**優先度**: 🔴 Critical
**影響**: GAS で非同期処理が完走しない

#### 修正対象ファイル
- `src/use-case/confluence-update-summary-job.ts`

#### 修正内容

**問題のコード（28-31行目付近）**:
```typescript
if (/* 条件 */) {
  initializeSummaryDataProcess(); // await がない
  return;
}
```

**修正後**:
```typescript
if (/* 条件 */) {
  await initializeSummaryDataProcess();
  return;
}
```

#### 作業手順
1. `src/use-case/confluence-update-summary-job.ts` を開く
2. 28-31行目付近の `initializeSummaryDataProcess()` 呼び出しに `await` を追加
3. 79-96行目付近にも同様の箇所があれば修正
4. `bun test` でテスト実行

---

### Task 3: diff URL パラメータの修正

**優先度**: 🟠 High
**影響**: 差分表示リンクが壊れる

#### 修正対象ファイル
- `src/services/confluence-slack/summary-payload.ts`

#### 修正内容

**問題のコード（49-67行目付近）**:
```typescript
// diffpagesbyversion に currentVersion を使用している
`${baseUrl}/pages/diffpagesbyversion.action?pageId=${pageId}&selectedPageVersions=${currentVersion}&...`
```

**修正後**:
```typescript
// revisedVersion を使用すべき
`${baseUrl}/pages/diffpagesbyversion.action?pageId=${pageId}&selectedPageVersions=${revisedVersion}&...`
```

#### 作業手順
1. `src/services/confluence-slack/summary-payload.ts` を開く
2. 49-67行目付近の diff URL 生成ロジックを確認
3. `currentVersion` を `revisedVersion`（または適切な変数名）に修正
4. `bun test` でテスト実行

#### 確認方法
- 生成された URL が Confluence の diff ページに正しくアクセスできることを確認

---

### Task 4: Slack 送信エラーハンドリング改善

**優先度**: 🟠 High
**影響**: 送信失敗を検知できない

#### 修正対象ファイル
1. `src/clients/slack-client.ts`
2. `src/services/slack/slack-message.ts`

#### 修正内容

**問題のコード（slack-client.ts:117-129）**:
```typescript
async send(payload: object): Promise<boolean> {
  try {
    await this.httpRequest(...);
    return true;
  } catch (error) {
    console.error("Slack メッセージ送信エラー:", error);
    return false; // エラー詳細が失われる
  }
}
```

**修正案A（例外をスロー）**:
```typescript
async send(payload: object): Promise<void> {
  const response = await this.httpRequest(...);
  if (!response.ok) {
    throw new Error(`Slack送信失敗: ${response.status} ${response.statusText}`);
  }
}
```

**修正案B（Result型）**:
```typescript
type SendResult = { success: true } | { success: false; error: string };

async send(payload: object): Promise<SendResult> {
  try {
    const response = await this.httpRequest(...);
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

#### 作業手順
1. 修正案A または B を選択（既存コードとの整合性を考慮）
2. `src/clients/slack-client.ts` の `send()` メソッドを修正
3. `src/services/slack/slack-message.ts` の呼び出し側を必要に応じて修正
4. 関連するテストを更新
5. `bun test` でテスト実行

---

### Task 5: rootPageIds 空配列チェック追加

**優先度**: 🟠 High
**影響**: API リクエスト失敗

#### 修正対象ファイル
- `src/clients/confluence-client.ts`

#### 修正内容

**問題**: 79-84行目で空配列を許容しているが、310-313行目付近で空配列チェックがない

#### 作業手順
1. `src/clients/confluence-client.ts` を開く
2. 310-313行目付近の `rootPageIds` を使用している箇所を確認
3. 空配列の場合に早期リターンまたはエラーをスローするガード節を追加
4. `bun test` でテスト実行

**追加するコード例**:
```typescript
if (this.rootPageIds.length === 0) {
  console.warn("rootPageIds が空のため、処理をスキップします");
  return [];
}
```

---

### Task 6: 環境変数バリデーション追加

**優先度**: 🟠 High
**影響**: 設定ミスに気づきにくい

#### 修正対象ファイル
- 環境変数を使用している各ファイル（または共通のバリデーション関数を作成）

#### 作業手順
1. 必須環境変数のリストを確認:
   - `CONFLUENCE_BASE_URL`
   - `CONFLUENCE_PAT`
   - `CONFLUENCE_PAGE_CONFIGS` または `ROOT_PAGE_ID`
   - `SLACK_WEBHOOK_URLS` または `SLACK_WEBHOOK_URL`
2. アプリケーション起動時にバリデーションを行う関数を作成または既存関数を強化
3. 未設定の場合は明確なエラーメッセージを出力

**コード例**:
```typescript
function validateRequiredEnvVars(): void {
  const required = ["CONFLUENCE_BASE_URL", "CONFLUENCE_PAT"];
  const missing = required.filter((key) => !getEnvVariable(key));
  if (missing.length > 0) {
    throw new Error(`必須環境変数が未設定です: ${missing.join(", ")}`);
  }
}
```

---

### Task 7: 型定義の重複解消

**優先度**: 🟡 Medium

#### 修正対象ファイル
- `src/types/slack.ts`

#### 作業手順
1. 105行目と166行目の `RichTextElement` 定義を確認
2. 一方を削除し、必要に応じて参照を修正
3. `bunx biome check .` で lint エラーがないことを確認
4. `bun test` でテスト実行

---

### Task 8: 未実装ジョブの削除または実装

**優先度**: 🟡 Medium

#### 修正対象ファイル
- `src/use-case/confluence-create-notify-job.ts`

#### 作業手順

**オプションA（削除する場合）**:
1. `src/use-case/confluence-create-notify-job.ts` を削除
2. `src/index.ts` からの参照を削除
3. 関連するテストがあれば削除

**オプションB（実装する場合）**:
1. 新規作成ページの取得ロジックを実装
2. 適切な Slack 通知ペイロードを生成
3. テストを追加

---

### Task 9: 廃止 API の削除

**優先度**: 🟡 Medium

#### 修正対象ファイル
1. `src/clients/confluence-client.ts`
2. `src/clients/slack-client.ts`

#### 作業手順
1. 各ファイルの `getInstance()` メソッドを検索
2. エラーをスローするだけの廃止メソッドを完全に削除
3. 呼び出し箇所がないことを確認
4. `bun test` でテスト実行

---

## 作業完了後の確認

1. `bun test` - 全テストがパスすること
2. `bunx biome check .` - lint エラーがないこと
3. `bun run build` - ビルドが成功すること

---

## 備考

- 各タスク完了後、上部のチェックリストにチェックを入れてください
- 不明点があれば、`tmp/comprehensive-review-report.md` の詳細を参照してください
- Medium 以下のタスクは時間があれば対応してください
