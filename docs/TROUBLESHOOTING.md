# トラブルシューティング

このドキュメントでは、よくある問題と解決策を説明します。

## 認証エラー

### Confluence API で 401 エラー

**症状**: `Exception: Request failed for https://... returned code 401`

**原因**: Personal Access Token (PAT) が無効または期限切れ

**解決策**:
1. Confluence で新しい PAT を発行
2. 環境変数 `CONFLUENCE_PAT` を更新
3. GAS の場合は Script Properties も更新

### Slack Webhook で 403 エラー

**症状**: Slack に通知が届かない、403 エラー

**原因**: Webhook URL が無効または削除された

**解決策**:
1. Slack App の設定を確認
2. 新しい Webhook URL を発行
3. 環境変数 `SLACK_WEBHOOK_URL` を更新

## 接続エラー

### Confluence に接続できない

**症状**: `Exception: DNS error` または `Connection refused`

**原因**:
- `CONFLUENCE_URL` が間違っている
- Confluence サーバーがダウンしている
- ネットワーク制限（GAS からアクセスできない）

**解決策**:
1. URL が正しいか確認（末尾のスラッシュに注意）
2. ブラウザから Confluence にアクセスできるか確認
3. GAS からのアクセスがファイアウォールでブロックされていないか確認

### GAS からオンプレ Confluence にアクセスできない

**症状**: GAS 環境でのみ接続エラー

**原因**: GAS は Google のサーバーから実行されるため、イントラネット内の Confluence にはアクセスできない

**解決策**:
- VPN や踏み台サーバーは使用不可
- Confluence を外部公開するか、Cloud 版への移行を検討

## 実行時エラー

### 「関数が見つかりません」エラー

**症状**: トリガー実行時に `Script function not found`

**原因**:
- ビルドが完了していない
- 関数名が変更された

**解決策**:
1. `bun run push` で再デプロイ
2. トリガーの関数名を確認

### 実行時間制限超過

**症状**: `Exceeded maximum execution time`

**原因**: GAS の 6 分制限を超過

**解決策**:
- 監視対象のページ数を減らす
- 実行頻度を上げて 1 回あたりの処理量を減らす
- `ROOT_PAGE_ID` で監視範囲を絞る

### メモリ不足

**症状**: `Out of memory` エラー

**原因**: 取得するページ数が多すぎる

**解決策**:
- 監視範囲を絞る
- ページネーションの `limit` を調整

## スケジュール関連

### ジョブが実行されない

**症状**: トリガーは動いているが通知が来ない

**原因**:
- スケジュール設定で実行時間外
- 更新されたページがない

**確認方法**:
1. GAS の実行ログを確認
2. `job-schedule-config.ts` の設定を確認
3. Confluence で実際に更新があるか確認

### 重複通知が発生する

**症状**: 同じページの更新が複数回通知される

**原因**:
- タイムスタンプの保存に失敗している
- トリガーが重複して設定されている

**解決策**:
1. `data/` ディレクトリ（または Script Properties）の状態を確認
2. GAS のトリガー設定で重複がないか確認

## ビルド・デプロイ関連

### ビルドエラー

**症状**: `bun run build` が失敗

**原因**:
- TypeScript のコンパイルエラー
- 依存関係の問題

**解決策**:
```bash
# 依存関係を再インストール
rm -rf node_modules
bun install

# 型エラーを確認
bunx tsc --noEmit
```

### clasp push エラー

**症状**: `bun run push` で clasp エラー

**原因**:
- clasp にログインしていない
- Script ID が間違っている
- 権限がない

**解決策**:
```bash
# 再ログイン
bunx clasp logout
bunx clasp login

# Script ID を確認
cat .clasp-dev.json
```

### 「ファイルが見つかりません」エラー

**症状**: `ENOENT: no such file or directory, open '.clasp.json'`

**原因**: `bun run push` 実行前にビルドが必要

**解決策**:
```bash
# push コマンドは内部で build を実行するため、通常は発生しない
# 手動で clasp push を実行した場合に発生する可能性あり
bun run build
bunx clasp push
```

## デバッグ方法

### ローカルでのデバッグ

```bash
# ローカル実行
bun run ./debug-local.ts

# 特定のテストのみ実行
bun test src/utils/url.test.ts
```

### GAS でのデバッグ

1. Apps Script エディタを開く
2. 実行したい関数を選択
3. 「実行」をクリック
4. 「実行ログ」で出力を確認

### ログの追加

一時的にログを追加してデバッグする場合：

```typescript
// GAS 環境
console.log("debug:", variable);

// ローカル環境
console.log("debug:", variable);
```

GAS では `console.log` の出力は「実行ログ」に表示されます。

## よくある質問

### Q: ローカルでは動くが GAS では動かない

A: 以下を確認してください：
- Script Properties が正しく設定されているか
- GAS から Confluence サーバーにアクセスできるか（イントラネットの場合は不可）
- GAS の実行ログでエラーを確認

### Q: 特定のページだけ通知されない

A: 以下を確認してください：
- そのページが `ROOT_PAGE_ID` の配下にあるか
- そのページが `SPACE_KEY` のスペースに属しているか
- ページの更新日時がタイムスタンプより新しいか

### Q: 通知メッセージをカスタマイズしたい

A: `src/services/confluence-slack/` 内のファイルを編集してください：
- `message-payload.ts`: 個別通知のフォーマット
- `summary-payload.ts`: サマリー通知のフォーマット

## サポート

上記で解決しない場合は、Issue を作成してください。その際、以下の情報を含めてください：

- エラーメッセージ（全文）
- 実行環境（GAS / ローカル）
- 再現手順
- 期待する動作
