import { getEnvVariable } from "./env";

// ログレベルの型定義
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// ログレベルの優先度（数値が大きいほど優先度が高い）
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// 有効なログレベルかどうかを判定
function isValidLogLevel(level: string): level is LogLevel {
  return level in LOG_LEVEL_PRIORITY;
}

// タイムスタンプをISO 8601形式（JST固定）で取得
function getTimestamp(): string {
  const now = new Date();
  const jstOffsetMinutes = 9 * 60;
  const jst = new Date(now.getTime() + jstOffsetMinutes * 60 * 1000);
  return jst.toISOString().replace("Z", "+09:00");
}

/**
 * ロガークラス
 *
 * 環境変数 LOG_LEVEL でログ出力レベルを制御可能
 * - DEBUG: すべてのログを出力
 * - INFO: INFO, WARN, ERROR を出力（デフォルト）
 * - WARN: WARN, ERROR を出力
 * - ERROR: ERROR のみ出力
 */
export class Logger {
  private static globalLevel: LogLevel = "INFO";
  private static initialized = false;
  private context: string;

  constructor(context: string) {
    this.context = context;
    // 初回のみ初期化
    if (!Logger.initialized) {
      Logger.initialize();
    }
  }

  /**
   * 環境変数からログレベルを設定
   * 無効な値が指定された場合はデフォルト（INFO）を使用し、警告を出力
   */
  static initialize(): void {
    if (Logger.initialized) {
      return;
    }

    const level = getEnvVariable("LOG_LEVEL");
    if (level) {
      const normalizedLevel = level.toUpperCase();
      if (isValidLogLevel(normalizedLevel)) {
        Logger.globalLevel = normalizedLevel;
      } else {
        console.warn(
          `[Logger] 無効なLOG_LEVEL "${level}" が指定されました。デフォルト "INFO" を使用します。`,
        );
      }
    }
    Logger.initialized = true;
  }

  /**
   * 指定レベルのログを出力すべきか判定
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[Logger.globalLevel];
  }

  /**
   * ログメッセージをフォーマット
   */
  private formatMessage(level: LogLevel, message: string, data?: object): string {
    const timestamp = getTimestamp();
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level}] [${this.context}] ${message}${dataStr}`;
  }

  /**
   * DEBUGレベルのログを出力
   */
  debug(message: string, data?: object): void {
    if (this.shouldLog("DEBUG")) {
      console.log(this.formatMessage("DEBUG", message, data));
    }
  }

  /**
   * INFOレベルのログを出力
   */
  info(message: string, data?: object): void {
    if (this.shouldLog("INFO")) {
      console.log(this.formatMessage("INFO", message, data));
    }
  }

  /**
   * WARNレベルのログを出力
   */
  warn(message: string, data?: object): void {
    if (this.shouldLog("WARN")) {
      console.warn(this.formatMessage("WARN", message, data));
    }
  }

  /**
   * ERRORレベルのログを出力
   * エラーオブジェクトが渡された場合はスタックトレースも出力
   */
  error(message: string, error?: Error, data?: object): void {
    if (this.shouldLog("ERROR")) {
      const formattedMessage = this.formatMessage("ERROR", message, data);
      console.error(formattedMessage);
      if (error?.stack) {
        console.error(`  Stack: ${error.stack}`);
      }
    }
  }

  /**
   * 現在のログレベルを取得（テスト用）
   */
  static getLevel(): LogLevel {
    return Logger.globalLevel;
  }

  /**
   * ログレベルをリセット（テスト用）
   */
  static reset(): void {
    Logger.globalLevel = "INFO";
    Logger.initialized = false;
  }
}

/**
 * Loggerインスタンスを作成するファクトリ関数
 * @param context ログの出力元を識別する文字列（例: "ConfluenceClient", "JobData"）
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
