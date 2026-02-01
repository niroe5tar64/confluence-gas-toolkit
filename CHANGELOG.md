# Changelog

このプロジェクトの主な変更履歴を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいています。

## [0.1.0] - 2026-02-02

### Added
- `confluenceCreateNotifyJob`: ページ新規作成通知機能を実装
  - 新規作成ページ（version.number === 1）の検出
  - Slack への個別通知
- Slack複数チャンネル対応
  - ジョブごとに異なる送信先チャンネルを指定可能
  - レジストリパターンによる複数SlackClient管理
- ジョブごとに異なるROOT_PAGE_IDを指定可能（ConfluenceClientレジストリパターン）
- 環境別設定ファイル（`*.dev.ts` / `*.prod.ts`）のビルド時切り替え
- 環境ごとの `.env` 準備スクリプト（`bun run prepare:env`）
- 主要なユーティリティ・サービスの単体テストを追加
- ドキュメント追加
  - CONTRIBUTING.md, ARCHITECTURE.md, CONFIGURATION.md
  - DEPLOYMENT.md, TROUBLESHOOTING.md
- DevContainer環境の設定追加

### Changed
- 設定管理の整理
  - 秘匿情報ではない設定を環境変数から設定ファイルに移動
  - `CONFLUENCE_PAGE_CONFIGS` を設定ファイル管理に統一
- 型定義の改善
  - Confluence・Slack型定義を最小化し外部パッケージ依存を削除
  - 型安全性とnull安全性を改善
- 環境判定ロジックを `isLocalEnvironment()` に共通化
- import文をアルファベット順に整理

### Removed
- `ConfluenceClient.getInstance()`: 廃止（`getConfluenceClient(jobName)` を使用）
- `SlackClient.getInstance()`: 廃止（`getSlackClient(targetKey)` を使用）
- 後方互換の環境変数フォールバックを廃止

### Fixed
- `POLING_INFO_DIR` の typo を `POLLING_INFO_DIR` に修正
- clasp準備スクリプトの引数 `---prod` を `--prod` に修正
- タイムスタンプ無効判定を修正（`Number.isNaN(date.getTime())` に統一）
- `confluenceUpdateSummaryJob` の await 忘れを修正
- サマリーペイロードの diff URL パラメータを修正
- Slack 通知の Content-Type エラーを修正
- HttpClient で process オブジェクトの存在チェックを追加（GAS互換性）

## [0.0.1] - 2025-04-20

### Added
- Confluence ページ更新の Slack 通知機能
  - 個別通知 (`confluenceUpdateNotifyJob`)
  - サマリー通知 (`confluenceUpdateSummaryJob`)
- デュアル環境対応（GAS / ローカル）
- スケジュール実行機能（曜日・時間帯指定）
- Confluence REST API クライアント
- Slack Webhook クライアント
- ローカル開発環境（Bun + Vite）
- テスト環境（Bun test）
- Biome による Lint・フォーマット

---

## バージョニング規則

このプロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

- **MAJOR**: 後方互換性のない変更
- **MINOR**: 後方互換性のある機能追加
- **PATCH**: 後方互換性のあるバグ修正

## 変更の種類

- **Added**: 新機能
- **Changed**: 既存機能の変更
- **Deprecated**: 将来削除予定の機能
- **Removed**: 削除された機能
- **Fixed**: バグ修正
- **Security**: セキュリティ修正
