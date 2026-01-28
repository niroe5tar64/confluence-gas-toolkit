---
paths:
  - "src/**/*.ts"
---

# アーキテクチャ（AI Agent向け）

## レイヤー構造

```
src/index.ts        → GASエントリーポイント（exportのみ）
src/use-case/       → ジョブオーケストレーション
src/services/       → ビジネスロジック
  ├─ confluence/    → Confluence API連携 & ページネーション
  ├─ slack/         → メッセージ送信
  ├─ confluence-slack/ → ペイロード変換（Confluence→Slack）
  ├─ scheduler/     → 時間ベースの実行ルール
  └─ io/            → ジョブ状態の永続化
src/clients/        → APIクライアント（シングルトン）
  ├─ http-client.ts → デュアル環境対応基底クラス
  ├─ confluence-client.ts
  └─ slack-client.ts
src/types/          → 型定義
src/utils/          → ユーティリティ
```

## パスエイリアス

tsconfig.json & vite.config.ts で設定済み：
- `~/clients`, `~/services`, `~/types`, `~/use-case`, `~/utils`

## デュアル環境対応

コードはGASとローカル（Node.js/Bun）の両方で動作する。

### 環境判定
```typescript
const isGAS = typeof process === "undefined" || process.env.TARGET === "gas";
```

### 切り替えポイント
- `HttpClient`: GASでは`UrlFetchApp.fetch()`、ローカルでは`fetch()`
- `getEnvVariable()`: GASでは`PropertiesService`、ローカルでは`process.env`
- 状態永続化: GASでは`PropertiesService`、ローカルでは`data/*.json`

## データフロー（更新通知ジョブ）

1. スケジュールチェック → 時間外なら終了
2. 前回タイムスタンプ読み込み
3. Confluence APIで更新ページ取得（ページネーション対応）
4. Slackメッセージに変換して送信
5. 最新タイムスタンプを保存

## 拡張時の注意

- 新クライアント追加: `src/clients/` に配置
- 新サービス追加: `src/services/<name>/` に配置、`index.ts`でre-export
- 新ジョブ追加: `src/use-case/` に配置、`src/index.ts`からexport
