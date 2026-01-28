# コードレビュー報告書

調査日: 2026-01-28

## 概要

コードベース全体を調査し、修正が必要な箇所を以下にまとめました。

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

**影響**: APIレスポンスに `_links` がない場合、`Cannot read property 'next' of undefined` エラーが発生する。

---

## SEVERE（深刻）

### 4. 非同期処理の問題

**ファイル**: `src/use-case/confluence-update-notify-job.ts:51-54`

```typescript
// 現在（誤り）- awaitなしのmap
sortedSearchResults.map(async (result: Confluence.SearchResult) => {
  const payload = convertSearchResultToMessagePayload(result, recentChangePages._links.base);
  await sendSlackMessage(payload);
});

// 修正後
await Promise.all(sortedSearchResults.map(async (result: Confluence.SearchResult) => {
  const payload = convertSearchResultToMessagePayload(result, recentChangePages._links.base);
  await sendSlackMessage(payload);
}));
```

**影響**:
- Slack メッセージ送信の完了を待たずにジョブが終了する
- Promise の reject が無視される
- エラーが発生しても検知できない

---

## HIGH（高）

### 5. オプショナルチェーンの不足

**ファイル**: `src/services/confluence-slack/message-payload.ts:34`

```typescript
// 現在（危険）
updatedBy: version?.by.displayName,

// 修正後
updatedBy: version?.by?.displayName,
```

**影響**: `version` が存在しても `by` が undefined の場合にエラーが発生する。

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
| HIGH | 3 | 近日中に修正 |
| MEDIUM | 2 | 計画的に修正 |
| LOW | 4 | 余裕があれば修正 |
| **合計** | **13** | |

---

## 推奨アクション

1. **即時対応**:
   - `bin/prepare-clasp-json.ts` のフラグ修正（本番デプロイが動作しない）
   - `src/services/slack/slack-message.ts` のインポートパス修正
   - 非同期処理の `Promise.all` 追加

2. **次回リリース前**:
   - オプショナルチェーンの追加
   - 空配列チェックの追加
   - 型アサーションの改善

3. **リファクタリング**:
   - 不要なコメントアウトコードの削除
   - スペルミスの修正
   - biome-ignore の説明追記
