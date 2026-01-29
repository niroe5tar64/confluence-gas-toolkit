## プロジェクトレビュー結果

### 1. 仕様上の問題点

1.1 confluenceCreateNotifyJob が未実装（スタブ）
  - ファイル: src/use-case/confluence-create-notify-job.ts:12-14
  - 状況: 固定メッセージ「新規ページが作成されました」を送信するだけで、実際の新規ページ検出ロジックがない
  - 影響: このジョブをGASトリガーで実行しても機能しない

1.2 実行スケジュールの不整合
  - ファイル: src/services/scheduler/job-schedule-config.ts
  - 問題: jobExecutionPolicy に confluenceUpdateNotifyJob のみ定義
  - 欠落: confluenceUpdateSummaryJob と confluenceCreateNotifyJob のポリシーがない
  - リスク: isJobExecutionAllowed("confluenceUpdateSummaryJob") を呼ぶと ランタイムエラー (undefined.executableConditions)

```
// job-execution-check.ts:24 で以下のコードが実行される
return jobExecutionPolicy[jobName].executableConditions.some(...)
// → jobExecutionPolicy["confluenceUpdateSummaryJob"] は undefined
```

1.3 JobDataFileName 型の不足

  - ファイル: src/types/job.ts:18
  - 状況: 2つのファイル名のみ定義
  - 欠落: confluenceCreateNotifyJob 用のファイル名がない
  - 影響: 将来的な実装時に型を追加する必要あり

---
### 2. 実装上の潜在的問題

2.1 複数通知の並列送信

- ファイル: src/use-case/confluence-update-notify-job.ts:58-63
- 問題: Promise.all() で Slack 通知を並列送信
- リスク:
  - 送信順序が保証されない（ソートしても並列なので意味がない）
  - Slack API のレート制限に引っかかる可能性（短時間に大量送信時）

```
// 現在のコード
await Promise.all(
  sortedSearchResults.map(async (result) => {
    const payload = convertSearchResultToMessagePayload(result, baseUrl);
    await sendSlackMessage(payload, TARGET_KEY);
  }),
);
```

2.2 .env.sample と実装の乖離
  - ファイル: .env.sample
  - 問題: SLACK_WEBHOOK_URLS（新形式）の設定例がない
  - 現状: SLACK_WEBHOOK_URL（旧形式・後方互換）のみ記載
  - ジョブごとに異なるチャンネルに送信する機能が文書化されていない

---
### 3. 設計上の不明瞭な点

3.1 スケジュールチェックの適用範囲
  - confluenceUpdateNotifyJob: スケジュールチェック あり
  - confluenceUpdateSummaryJob: スケジュールチェック なし（意図的？）
  - confluenceCreateNotifyJob: スケジュールチェック なし（未実装なので不明）

疑問: サマリージョブは週1回の手動/トリガー実行を想定しているため意図的に省略？
→ この機能は現在停止中の機能なので意図的に省略しています。

3.2 deprecated API の整理
  - ConfluenceClient.getInstance() - deprecated 宣言済み
  - SlackClient.getInstance() - deprecated 宣言済み
  - サービス層: fetchConfluenceApi() で jobName が未指定の場合、deprecated API にフォールバック

→ 実装を複雑にしたくない意図はあるので、例外を返すように修正

---
### 4. 良い点（問題なし）
- テスト: 106件すべてパス
- 型安全性: Type Guard が適切に実装されている
- 後方互換性: 環境変数の新旧形式に対応
- レイヤー構造: 依存関係が適切に分離されている
- ページネーション: Confluence API の複数ページ取得が正しく実装

---
5. 推奨アクション（優先度順）
┌────────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 優先度 │              項目              │                                                  内容                                                  │
├────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 高     │ スケジュールポリシー追加       │ confluenceUpdateSummaryJob, confluenceCreateNotifyJob を追加するか、未定義時のフォールバック処理を追加 │
├────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 中     │ 並列送信の見直し               │ 順序保証が必要なら逐次送信に変更、または順序不要ならソート削除                                         │
├────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 中     │ .env.sample 更新               │ SLACK_WEBHOOK_URLS の設定例を追加                                                                      │
├────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 低     │ confluenceCreateNotifyJob 実装 │ 必要に応じて新規ページ検出ロジックを実装                                                               │
└────────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────┘
---
何か詳細を確認したい項目や、修正を進めたい箇所はありますか？
→ 推奨の方法で対応して欲しい。
また、テストコードの実装も行なって欲しい。そして、ドキュメントとの乖離がないようにドキュメントの保守も行なってください。