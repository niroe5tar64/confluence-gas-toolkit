# Changelog

このプロジェクトの主な変更履歴を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいています。

## [Unreleased]

### Added
- CONTRIBUTING.md: コントリビューションガイドを追加
- docs/CONFIGURATION.md: 設定ガイドを追加
- docs/DEPLOYMENT.md: デプロイガイドを追加
- docs/ARCHITECTURE.md: アーキテクチャガイドを追加
- docs/TROUBLESHOOTING.md: トラブルシューティングガイドを追加

### Changed
- 型安全性とnull安全性を改善
- import文をアルファベット順に整理

### Fixed
- `POLING_INFO_DIR` の typo を `POLLING_INFO_DIR` に修正
- clasp準備スクリプトの引数 `---prod` を `--prod` に修正

## [0.0.1] - 初期リリース

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
