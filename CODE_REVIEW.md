# コードレビュー報告書

調査日: 2026-01-28

## 概要

コードベース全体を調査し、修正が必要な箇所を以下にまとめました。

### 型定義の変更について

2026-01-28 に外部パッケージ依存を削除し、Confluence・Slack の型定義を最小化しました：

- **`src/types/confluence.ts`**: `fetch-confluence` パッケージの依存を削除。実装で使用されているプロパティのみを定義
  - `SearchPage._links` は `{ [key: string]: string }` の構造に統一
  - `Version.by` は必須プロパティ、`displayName` を必須として定義

- **`src/types/slack.ts`**: `@slack/webhook` パッケージの依存を削除。Block Kit 仕様に基づいた型定義を実装
  - `MessagePayload` は簡潔な構造に変更

このため、本レビュー内の「HIGH#5. オプショナルチェーンの不足」と「SEVERE#4. 非同期処理の問題」の部分は、新しい型定義を踏まえて修正されています。

---

## CRITICAL（重大）

### 1. インポートパスの誤り

**ファイル**: `src/services/slack/slack-message.ts:1`

```typescript
// 現在（誤り）
import { Slack } from "src/types/slack";

// 修正後
import { Slack } from "~/types";
```

**影響**: ビルド時にモジュール解決に失敗する可能性。他のファイルはすべて `~/` エイリアスを使用しており、一貫性がない。

---

### 2. コマンドラインフラグのタイポ

**ファイル**: `bin/prepare-clasp-json.ts:4`

```typescript
// 現在（誤り）- ハイフンが3つ
const prod = process.argv.some((arg) => arg === "---prod");

// 修正後 - ハイフンは2つ
const prod = process.argv.some((arg) => arg === "--prod");
```

**影響**: `bun run push:prod` を実行しても `--prod` フラグが認識されず、常に開発環境用の `.clasp-dev.json` が使用される。本番デプロイが機能しない。

---

### 3. ページネーションの安全性

**ファイル**:
- `src/services/confluence/recent-changes.ts:46, 73`
- `src/use-case/confluence-update-notify-job.ts:52`
- `src/use-case/confluence-update-summary-job.ts:50`

```typescript
// 現在（危険）
nextEndpoint = nextPages._links.next;

// 修正後
nextEndpoint = nextPages._links?.next;
```

**影響**: 型定義で `_links` は必須プロパティとして定義されているが、`next` キーが存在しない場合（最後のページ時）、undefined が返る。この値を直接使用するとエラーが発生する。

---

## SEVERE（深刻）

### 4. 非同期処理の問題と型安全性

**ファイル**: `src/use-case/confluence-update-notify-job.ts:51-54`

```typescript
// 現在（誤り）- awaitなしのmap、かつ _links.base の安全性が不確定
sortedSearchResults.map(async (result: Confluence.SearchResult) => {
  const payload = convertSearchResultToMessagePayload(result, recentChangePages._links.base);
  await sendSlackMessage(payload);
});

// 修正後
await Promise.all(sortedSearchResults.map(async (result: Confluence.SearchResult) => {
  const payload = convertSearchResultToMessagePayload(result, recentChangePages._links.base || "");
  await sendSlackMessage(payload);
}));
```

**影響**:
- Slack メッセージ送信の完了を待たずにジョブが終了する
- Promise の reject が無視される
- エラーが発生しても検知できない
- 型定義で `_links: { [key: string]: string }` のため、`base` キーの存在が保証されない

---

## HIGH（高）

### 5. オプショナルチェーンの不足

**ファイル**: `src/services/confluence-slack/message-payload.ts:34`

```typescript
// 現在（問題なし）
updatedBy: version?.by.displayName,

// 型定義では by が必須なため、上記で十分
// version が undefined なら undefined、存在なら displayName を返す
```

**型定義の変更**: 新しい `Confluence.Version` 型では、`by` を必須プロパティとして定義したため、`version?.by.displayName` で安全。`by` が undefined の可能性は考慮不要。

---

### 6. 空配列での Math.max() 呼び出し

**ファイル**: `src/use-case/confluence-update-notify-job.ts:61`

```typescript
// 現在（危険）
const latestUpdatedAt = new Date(Math.max(...updatedAtList.map((date) => date.getTime())));

// 修正後
const latestUpdatedAt = updatedAtList.length > 0
  ? new Date(Math.max(...updatedAtList.map((date) => date.getTime())))
  : new Date();
```

**影響**: 配列が空の場合、`Math.max()` が `-Infinity` を返し、不正な Date オブジェクトが生成される。

---

### 7. 安全でない型アサーション

**ファイル**: `src/use-case/confluence-update-summary-job.ts:23`

```typescript
// 現在（危険）
const jobData = parseJobData("confluence-summary-job.json") as JobDataForSummaryJob;

// 修正後
const jobData = parseJobData("confluence-summary-job.json");
if (!jobData) {
  // null処理
}
const typedJobData = jobData as JobDataForSummaryJob;
```

**影響**: `parseJobData` は `null` を返す可能性があるが、型アサーションで無視されている。

---

## MEDIUM（中）

### 8. エラーハンドリングの不備

**ファイル**: `src/services/slack/slack-message.ts:44`

```typescript
// 現在 - 戻り値を無視
async function sendSlackMessage(payload: Slack.MessagePayload) {
  const client = SlackClient.getInstance();
  await client.send(payload);  // 戻り値(boolean)を確認していない
}
```

**影響**: Slack送信失敗時にサイレントに失敗し、呼び出し元が把握できない。

---

### 9. コメントアウトされたコード

**ファイル**: `src/services/confluence-slack/summary-payload.ts:122-127`

```typescript
// richTextElements.push({
//   type: "text",
//   text:
//     `last updated at: ${lastUpdated.by ?? "不明"}` +  // ← "at" と "by" が逆
//     `last updated by: ${lastUpdated.at ? formatDateJST(lastUpdated.at) : "不明"}`,
// });
```

**影響**: 不要なコード。削除するか、使用する場合はラベルの誤りも修正が必要。

---

## LOW（低）

### 10. 定数名のスペルミス

**ファイル**: `src/services/io/job-data.ts:4`

```typescript
// 現在
const POLING_INFO_DIR = "data";

// 修正後
const POLLING_INFO_DIR = "data";
```

**影響**: 動作には影響しないが、可読性に影響。

---

### 11. biome-ignore の説明不足

**ファイル**:
- `src/types/job.ts:31`
- `src/utils/url.ts:7`

```typescript
// 現在
// biome-ignore lint/suspicious/noExplicitAny: <explanation>

// 修正後（例）
// biome-ignore lint/suspicious/noExplicitAny: JSONパース結果の型が不定のため
```

---

### 12. tsconfig.json の末尾カンマ

**ファイル**: `tsconfig.json:28`

```json
"types": [
  "bun-types",
  "google-apps-script",  // ← 末尾カンマ（厳密なJSONでは不正）
]
```

**影響**: 一部のツールでパースエラーになる可能性。

---

### 13. TODO コメント

**ファイル**: `src/types/job.ts:24`

```typescript
// TODO: 型名などを精査する。
```

**対応**: 解決するか、Issue 化して追跡する。

---

## 修正優先度まとめ

| 優先度 | 件数 | 対応 |
|--------|------|------|
| CRITICAL | 3 | 即時修正必須 |
| SEVERE | 1 | 早急に修正 |
| HIGH | 2 | 近日中に修正（#5 は型定義の変更により解決） |
| MEDIUM | 2 | 計画的に修正 |
| LOW | 4 | 余裕があれば修正 |
| **合計** | **12** | |

**注**: HIGH#5（オプショナルチェーンの不足）は、新しい型定義で `Version.by` が必須プロパティとして定義されたため、型安全性が確保された。

---

## 推奨アクション

1. **即時対応** (CRITICAL・SEVERE):
   - `bin/prepare-clasp-json.ts` のフラグ修正（本番デプロイが動作しない）
   - `src/services/slack/slack-message.ts` のインポートパス修正
   - 非同期処理の `Promise.all` 追加と `_links.base` の存在チェック

2. **次回リリース前** (HIGH):
   - ページネーション時の `_links.next` のオプショナルチェーン追加
   - 空配列チェックの追加
   - 型アサーションの改善

3. **リファクタリング** (MEDIUM・LOW):
   - 不要なコメントアウトコードの削除
   - スペルミスの修正（`POLING_INFO_DIR` → `POLLING_INFO_DIR`）
   - biome-ignore の説明追記
   - tsconfig.json の末尾カンマ削除
