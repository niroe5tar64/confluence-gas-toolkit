import { getAppEnv } from "~/utils";

/**
 * IO関連の設定
 */
export const IO_CONFIG = {
  /**
   * ジョブデータを保存するディレクトリパス
   *
   * - 本番環境: `confluence-gas-toolkit/prod`
   * - 開発環境: `confluence-gas-toolkit/dev`
   */
  get dataDir(): string {
    return `confluence-gas-toolkit/${getAppEnv()}`;
  },
} as const;
