# CLAUDE.md

Confluence Server/Data Center の更新を監視し、Slack通知するGASツールキット。

## コマンド

```bash
bun install          # 依存関係インストール
bun test             # テスト実行
bun run build        # GAS用ビルド
bun run push         # 開発環境へプッシュ
bun run push:prod    # 本番環境へプッシュ
bunx biome check .   # Lint
```

## 構造

```
src/index.ts → use-case/ → services/ → clients/
```

- `use-case/`: ジョブオーケストレーション
- `services/`: ビジネスロジック（confluence/, slack/, scheduler/, io/）
- `clients/`: APIクライアント（デュアル環境対応）
- `types/`: 型定義
- `utils/`: ユーティリティ

## 重要ポイント

- **デュアル環境**: GASとローカル両方で動作（HttpClient, getEnvVariable が環境を自動判定）
- **コメントは日本語**
- **パスエイリアス**: `~/clients`, `~/config`, `~/services`, `~/types`, `~/use-case`, `~/utils`

詳細は `.claude/rules/` を参照。
