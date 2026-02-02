import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createLogger, Logger } from "./logger";

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

describe("Logger", () => {
  beforeEach(() => {
    Logger.reset();
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  afterEach(() => {
    Logger.reset();
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    delete process.env.LOG_LEVEL;
  });

  describe("ログレベル制御", () => {
    test("デフォルトはINFOレベル", () => {
      expect(Logger.getLevel()).toBe("INFO");
    });

    test("DEBUGレベルではすべてのログが出力される", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("Test");
      const consoleSpy = mock((..._args: unknown[]) => {});
      console.log = consoleSpy as typeof console.log;

      logger.debug("test message");

      expect(consoleSpy).toHaveBeenCalled();
    });

    test("INFOレベルではDEBUGログは出力されない", () => {
      process.env.LOG_LEVEL = "INFO";
      Logger.reset();

      const logger = createLogger("Test");
      const consoleSpy = mock((..._args: unknown[]) => {});
      console.log = consoleSpy as typeof console.log;

      logger.debug("test message");

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test("小文字のlog_levelも受け入れて大文字に正規化される", () => {
      process.env.LOG_LEVEL = "warn";
      Logger.reset();

      createLogger("Test");

      expect(Logger.getLevel()).toBe("WARN");
    });

    test("無効なLOG_LEVELはINFOにフォールバックして警告を出力", () => {
      process.env.LOG_LEVEL = "INVALID";
      const warnSpy = mock(() => {});
      console.warn = warnSpy;

      Logger.reset();
      createLogger("Test");

      expect(Logger.getLevel()).toBe("INFO");
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("出力フォーマット", () => {
    test("contextがログに含まれる", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("TestContext");
      let output = "";
      console.log = (msg?: unknown, ..._rest: unknown[]) => {
        output = String(msg);
      };

      logger.info("test message");

      expect(output).toContain("[TestContext]");
      expect(output).toContain("[INFO]");
      expect(output).toContain("test message");
    });

    test("dataオブジェクトがJSON形式で出力される", () => {
      process.env.LOG_LEVEL = "DEBUG";
      Logger.reset();

      const logger = createLogger("Test");
      let output = "";
      console.log = (msg?: unknown, ..._rest: unknown[]) => {
        output = String(msg);
      };

      logger.info("test", { key: "value" });

      expect(output).toContain('{"key":"value"}');
    });
  });

  describe("エラーログ", () => {
    test("スタックトレースが出力される", () => {
      const logger = createLogger("Test");
      const outputs: string[] = [];
      console.error = (msg?: unknown, ..._rest: unknown[]) => {
        outputs.push(String(msg));
      };

      const error = new Error("test error");
      logger.error("エラー発生", error);

      expect(outputs.length).toBe(2);
      expect(outputs[0]).toContain("[ERROR]");
      expect(outputs[1]).toContain("Stack:");
    });
  });
});
