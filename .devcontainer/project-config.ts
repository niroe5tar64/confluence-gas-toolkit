/**
 * ctxlint（Context Spec検証CLI）の開発環境設定
 *
 * base + (preset) + この設定 がマージされて
 * .devcontainer/devcontainer.json が生成されます
 *
 * Haskell開発環境を含むpreset を使用する場合は、ビルド時に引数で指定：
 *   npx @niroe5tar64/devcontainer init
 */
export const projectConfig = {
  name: "Confluence-GAS-Toolkit",
};

/**
 * JSON に含める追加フィールド
 * （DevContainerConfig 型には含まれないが、JSON としては有効）
 */
export const projectConfigMetadata = {
  $comment: "",
};
