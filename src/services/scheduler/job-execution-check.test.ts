import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { JobExecutableCondition } from "~/types";
import { isJobExecutionAllowed, isJobExecutionTime } from "./job-execution-check";

const OriginalDate = Date;

describe("isJobExecutionTime", () => {
  // 平日 8:00 ~ 19:00 の条件（実際の設定と同じ）
  const weekdayBusinessHours: JobExecutableCondition = {
    allowedDays: [1, 2, 3, 4, 5], // 月〜金
    startHour: 8,
    endHour: 19,
  };

  describe("曜日の判定", () => {
    it("should return true for Monday within hours", () => {
      // 月曜日 12:00
      const date = new Date("2024-01-15T12:00:00"); // 月曜日
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });

    it("should return true for Friday within hours", () => {
      // 金曜日 12:00
      const date = new Date("2024-01-19T12:00:00"); // 金曜日
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });

    it("should return false for Saturday within hours", () => {
      // 土曜日 12:00（曜日が許可されていない）
      const date = new Date("2024-01-20T12:00:00"); // 土曜日
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });

    it("should return false for Sunday within hours", () => {
      // 日曜日 12:00（曜日が許可されていない）
      const date = new Date("2024-01-21T12:00:00"); // 日曜日
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });
  });

  describe("時間帯の判定", () => {
    it("should return true at exactly startHour:00", () => {
      // 月曜日 8:00 ちょうど（開始時刻）
      const date = new Date("2024-01-15T08:00:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });

    it("should return true at startHour:30", () => {
      // 月曜日 8:30
      const date = new Date("2024-01-15T08:30:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });

    it("should return true at exactly endHour:00", () => {
      // 月曜日 19:00 ちょうど（終了時刻）
      const date = new Date("2024-01-15T19:00:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });

    it("should return false at endHour:01", () => {
      // 月曜日 19:01（終了時刻を過ぎている）
      const date = new Date("2024-01-15T19:01:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });

    it("should return false before startHour", () => {
      // 月曜日 7:59（開始時刻前）
      const date = new Date("2024-01-15T07:59:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });

    it("should return true in the middle of the day", () => {
      // 月曜日 14:30（真ん中の時間）
      const date = new Date("2024-01-15T14:30:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(true);
    });
  });

  describe("エッジケース", () => {
    it("should return false for midnight on weekday", () => {
      // 月曜日 0:00（深夜）
      const date = new Date("2024-01-15T00:00:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });

    it("should return false for 23:59 on weekday", () => {
      // 月曜日 23:59（深夜）
      const date = new Date("2024-01-15T23:59:00");
      expect(isJobExecutionTime(date, weekdayBusinessHours)).toBe(false);
    });
  });

  describe("異なる条件での判定", () => {
    it("should work with weekend-only condition", () => {
      // 週末のみの条件
      const weekendCondition: JobExecutableCondition = {
        allowedDays: [0, 6], // 土日
        startHour: 10,
        endHour: 18,
      };
      const saturday = new Date("2024-01-20T12:00:00"); // 土曜日
      const monday = new Date("2024-01-15T12:00:00"); // 月曜日

      expect(isJobExecutionTime(saturday, weekendCondition)).toBe(true);
      expect(isJobExecutionTime(monday, weekendCondition)).toBe(false);
    });

    it("should work with all-day condition", () => {
      // 終日の条件
      const allDayCondition: JobExecutableCondition = {
        allowedDays: [0, 1, 2, 3, 4, 5, 6],
        startHour: 0,
        endHour: 23,
      };
      const midnight = new Date("2024-01-15T00:00:00");
      const noon = new Date("2024-01-15T12:00:00");
      const evening = new Date("2024-01-15T23:00:00");

      expect(isJobExecutionTime(midnight, allDayCondition)).toBe(true);
      expect(isJobExecutionTime(noon, allDayCondition)).toBe(true);
      expect(isJobExecutionTime(evening, allDayCondition)).toBe(true);
    });

    it("should work with single hour window", () => {
      // startHour === endHour の場合、その1時間全体が許可される
      // （startHour の条件: hour === startHour && minutes >= 0）
      const singleHourCondition: JobExecutableCondition = {
        allowedDays: [1],
        startHour: 12,
        endHour: 12,
      };
      const exactlyNoon = new Date("2024-01-15T12:00:00"); // 月曜日 12:00
      const midHour = new Date("2024-01-15T12:30:00"); // 月曜日 12:30
      const nextHour = new Date("2024-01-15T13:00:00"); // 月曜日 13:00

      expect(isJobExecutionTime(exactlyNoon, singleHourCondition)).toBe(true);
      expect(isJobExecutionTime(midHour, singleHourCondition)).toBe(true);
      expect(isJobExecutionTime(nextHour, singleHourCondition)).toBe(false);
    });

    it("should work with empty allowedDays", () => {
      // 許可された曜日がない条件
      const noAllowedDaysCondition: JobExecutableCondition = {
        allowedDays: [],
        startHour: 8,
        endHour: 19,
      };
      const monday = new Date("2024-01-15T12:00:00");

      expect(isJobExecutionTime(monday, noAllowedDaysCondition)).toBe(false);
    });
  });
});

describe("isJobExecutionAllowed", () => {
  describe("ポリシーが定義されているジョブ", () => {
    it("should return true for confluenceUpdateNotifyJob during allowed time", () => {
      // 月曜日 12:00（平日営業時間内）をモック
      const mockDate = new Date("2024-01-15T12:00:00");
      const spy = spyOn(globalThis, "Date" as unknown as "Date").mockImplementation(((
        ...args: ConstructorParameters<DateConstructor>
      ) =>
        args.length === 0
          ? new OriginalDate(mockDate)
          : new OriginalDate(...args)) as unknown as DateConstructor);

      expect(isJobExecutionAllowed("confluenceUpdateNotifyJob")).toBe(true);

      spy.mockRestore();
    });

    it("should return false for confluenceUpdateNotifyJob outside allowed time", () => {
      // 土曜日 12:00（週末）をモック
      const mockDate = new Date("2024-01-20T12:00:00");
      const spy = spyOn(globalThis, "Date" as unknown as "Date").mockImplementation(((
        ...args: ConstructorParameters<DateConstructor>
      ) =>
        args.length === 0
          ? new OriginalDate(mockDate)
          : new OriginalDate(...args)) as unknown as DateConstructor);

      expect(isJobExecutionAllowed("confluenceUpdateNotifyJob")).toBe(false);

      spy.mockRestore();
    });

    it("should return false for confluenceUpdateNotifyJob before business hours", () => {
      // 月曜日 7:00（営業時間前）をモック
      const mockDate = new Date("2024-01-15T07:00:00");
      const spy = spyOn(globalThis, "Date" as unknown as "Date").mockImplementation(((
        ...args: ConstructorParameters<DateConstructor>
      ) =>
        args.length === 0
          ? new OriginalDate(mockDate)
          : new OriginalDate(...args)) as unknown as DateConstructor);

      expect(isJobExecutionAllowed("confluenceUpdateNotifyJob")).toBe(false);

      spy.mockRestore();
    });
  });

  describe("ポリシーが未定義のジョブ", () => {
    it("should return true for confluenceUpdateSummaryJob (no policy defined)", () => {
      // ポリシー未定義のジョブは常に実行可能
      expect(isJobExecutionAllowed("confluenceUpdateSummaryJob")).toBe(true);
    });

    it("should return true for confluenceCreateNotifyJob (no policy defined)", () => {
      // ポリシー未定義のジョブは常に実行可能
      expect(isJobExecutionAllowed("confluenceCreateNotifyJob")).toBe(true);
    });
  });
});
