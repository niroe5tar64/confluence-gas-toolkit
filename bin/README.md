# bin/ ディレクトリ

TypeScriptコードをGoogle Apps Script (GAS) 用にビルド・デプロイするためのCLIスクリプト群。

## ディレクトリ構成

```
bin/
├── README.md                      # このファイル
├── build.ts                       # ビルドのエントリーポイント
├── build/
│   ├── banner.ts                  # バナー生成
│   ├── convert-to-gas.ts          # GAS変換ロジック
│   └── __test__/                  # テスト
├── deploy.ts                      # デプロイスクリプト
├── open.ts                        # ブラウザで開くスクリプト
├── push.ts                        # プッシュスクリプト
├── prepare-clasp-json.ts          # clasp設定準備
├── prepare-env.ts                 # 環境変数ファイル準備
├── init/
│   └── index.ts                   # プロジェクト初期化
└── template/
    ├── place-template.ts          # テンプレート置換ユーティリティ
    ├── package.json               # テンプレート用package.json
    └── __test__/                  # テスト
```

## 各ファイルの解説

### build.ts

**メインのビルドスクリプト**

```bash
bun run build  # package.json で設定されたコマンドを実行
```

#### 処理フロー

1. コマンドライン引数から入力/出力ファイルパスとグローバル名を取得
2. `package.json` からバナー情報を生成
3. `dist/` ディレクトリをクリーン＆再作成
4. `public/` の内容を `dist/` にコピー
5. `convert-to-gas` を実行してGAS用コードを生成

#### 引数

| 位置 | 内容 | デフォルト |
|------|------|-----------|
| argv[2] | 入力ファイル | 必須 |
| argv[3] | 出力ファイル | 必須 |
| argv[4] | グローバル名 | package.json の name（ハイフンはアンダースコアに変換） |

---

### build/banner.ts

**JSDocコメント形式のバナーを生成**

`package.json` の指定されたキーから、ビルド成果物の先頭に付与するバナーコメントを生成する。

#### 出力例

```javascript
/**
 * name: confluence-gas-toolkit
 * version: 1.0.0
 * author: Author Name
 * license: MIT
 */
```

---

### build/convert-to-gas.ts

**TypeScript → GAS変換の中核ロジック**

#### 主要関数

| 関数 | 説明 |
|------|------|
| `build()` | Viteを使用してIIFE形式にバンドル |
| `extractExportUsingDynamicImport()` | エクスポートをGASグローバル関数として再定義 |
| `convertToGoogleAppsScript()` | 上記2つを組み合わせてGASコードを生成 |
| `convertAndWriteGoogleAppsScript()` | 変換してファイルに書き出し |

#### 変換の仕組み

1. **Viteでバンドル**: TypeScriptコードをIIFE（即時実行関数式）形式にバンドル
   - `process.env.TARGET` を `"GAS"` として定義（GAS環境判定用）
   - `MINIFY=true` 環境変数でminify可能

2. **エクスポート抽出**: 動的インポートでエクスポートされた関数/変数を取得

3. **GASグローバル関数生成**: IIFEの中の関数をGASから呼び出せるようにラッパー関数を生成

#### 変換例

入力 (TypeScript):
```typescript
export const sayHello = (name: string) => {
  console.log(`Hello ${name}!`);
};
export const hello = "world";
```

出力 (GAS):
```javascript
var globalName = (function() {
  // バンドルされたコード
})();

function sayHello(...args){ return globalName.sayHello(...args); }
const hello = globalName.hello;
```

---

### deploy.ts

**GASプロジェクトをデプロイ**

```bash
bun run deploy       # 開発環境
bun run deploy:prod  # 本番環境
```

#### 処理フロー

1. `prepareClaspJson()` で適切な `.clasp.json` を準備
2. `prepareEnv()` で `.env` を環境に応じて準備
3. `bun run build` でビルド
4. `bunx clasp deploy` でデプロイ

---

### open.ts

**GASエディタをブラウザで開く**

```bash
bun run open       # 開発環境
bun run open:prod  # 本番環境
```

#### 処理フロー

1. `prepareClaspJson()` で適切な `.clasp.json` を準備
2. `prepareEnv()` で `.env` を環境に応じて準備
3. `bun run build` でビルド
4. `bunx clasp open` でブラウザを開く

---

### push.ts

**GASプロジェクトにプッシュ**

```bash
bun run push       # 開発環境
bun run push:prod  # 本番環境
```

#### 処理フロー

1. `prepareClaspJson()` で適切な `.clasp.json` を準備
2. `prepareEnv()` で `.env` を環境に応じて準備
3. `bun run build` でビルド
4. `bunx clasp push` でプッシュ

---

### prepare-clasp-json.ts

**clasp設定ファイルの準備**

コマンドライン引数に `--prod` があるかどうかで、使用する設定ファイルを切り替える。

| フラグ | コピー元 | コピー先 |
|--------|----------|----------|
| なし | `.clasp-dev.json` | `.clasp.json` |
| `--prod` | `.clasp-prod.json` | `.clasp.json` |

これにより、開発環境と本番環境で異なるGASプロジェクトを使い分けられる。

---

### init/index.ts

**プロジェクト初期化ウィザード**

```bash
bun run init
```

#### 処理フロー

1. **claspログイン確認**: `~/.clasprc.json` の存在をチェック
   - 未ログインの場合は `clasp login` を実行
   - 失敗時はGoogle Apps Script APIの有効化を促す

2. **プロジェクト名設定**: 対話形式で入力（デフォルト: カレントディレクトリ名）
   - `package.json` の `name` を更新

3. **GASプロジェクト作成**: 以下から選択
   - standalone
   - bound to Google Sheet/Doc/Form/Slides
   - webapp
   - API executable
   - 既存プロジェクトID指定
   - 後で作成

4. **設定ファイル生成**:
   - `.clasp.json`
   - `.clasp-dev.json`
   - `.clasp-prod.json`

---

### template/place-template.ts

**テンプレート置換ユーティリティ**

`${key}` 形式のプレースホルダを辞書で置換してファイルを生成する。

#### 使用例

テンプレート:
```json
{
  "version": "${version}",
  "name": "${name}"
}
```

辞書:
```typescript
{ version: "1.0.0", name: "my-app" }
```

出力:
```json
{
  "version": "1.0.0",
  "name": "my-app"
}
```

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                         bun run xxx                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   push.ts     │   │   deploy.ts     │   │    open.ts      │
│               │   │                 │   │                 │
│ clasp push    │   │ clasp deploy    │   │ clasp open      │
└───────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                ┌─────────────┴───────────────┐
                │                             │
                ▼                             ▼
┌───────────────────────────────────┐ ┌──────────────────────┐
│  prepare-clasp-json.ts            │ │ prepare-env.ts       │
│                                   │ │                      │
│ .clasp-dev.json  ─┐               │ │ .env.dev  ─┐         │
│ .clasp-prod.json ─┴──► .clasp.json│ │ .env.prod ─┴──► .env │
└───────────────────────────────────┘ └──────────────────────┘
                │                             │
                └─────────────┬───────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    build.ts     │
                    └─────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐   ┌────────────┐   ┌──────────┐
    │  banner.ts  │   │convert-to- │   │ public/  │
    │             │   │  gas.ts    │   │  copy    │
    └─────────────┘   └────────────┘   └──────────┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  dist/   │
                        │          │
                        │ main.js  │
                        └──────────┘
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `MINIFY` | `"true"` でビルド成果物をminify | `false` |
