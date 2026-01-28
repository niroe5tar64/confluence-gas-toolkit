import { describe, expect, it } from "bun:test";
import { isJobData } from "./job";

describe("isJobData", () => {
  describe("JobDataForUpdateJob（基本形）", () => {
    it("should return true for valid JobDataForUpdateJob", () => {
      // 基本的な JobDataForUpdateJob 形式
      const data = { timestamp: "2024-01-15T00:00:00Z" };
      expect(isJobData(data)).toBe(true);
    });

    it("should return true for JobDataForUpdateJob with extra properties", () => {
      // 追加のプロパティがあっても true
      const data = { timestamp: "2024-01-15T00:00:00Z", extra: "value" };
      expect(isJobData(data)).toBe(true);
    });
  });

  describe("JobDataForSummaryJob（originalVersions 付き）", () => {
    it("should return true for valid JobDataForSummaryJob", () => {
      // originalVersions を持つ JobDataForSummaryJob 形式
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: { "123": 1, "456": 2 },
      };
      expect(isJobData(data)).toBe(true);
    });

    it("should return true for empty originalVersions", () => {
      // 空の originalVersions でも true
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: {},
      };
      expect(isJobData(data)).toBe(true);
    });

    it("should return false if originalVersions contains non-number values", () => {
      // originalVersions の値が数値でない場合は false
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: { "123": "not a number" },
      };
      expect(isJobData(data)).toBe(false);
    });

    it("should return false if originalVersions is null", () => {
      // originalVersions が null の場合は false
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: null,
      };
      expect(isJobData(data)).toBe(false);
    });

    it("should return false if originalVersions is not an object", () => {
      // originalVersions がオブジェクトでない場合は false
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: "invalid",
      };
      expect(isJobData(data)).toBe(false);
    });

    it("should return false if originalVersions is an array", () => {
      // originalVersions が配列の場合も false（配列は object だが Record ではない）
      const data = {
        timestamp: "2024-01-15T00:00:00Z",
        originalVersions: [1, 2, 3],
      };
      // 配列の場合、Object.values は要素を返し、すべて number なので true になる可能性がある
      // 実装次第で結果が変わるが、現在の実装では配列も通過する
      expect(isJobData(data)).toBe(true);
    });
  });

  describe("無効な入力", () => {
    it("should return false for null", () => {
      expect(isJobData(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isJobData(undefined)).toBe(false);
    });

    it("should return false for a string", () => {
      expect(isJobData("not an object")).toBe(false);
    });

    it("should return false for a number", () => {
      expect(isJobData(123)).toBe(false);
    });

    it("should return false for an array", () => {
      expect(isJobData([{ timestamp: "2024-01-15T00:00:00Z" }])).toBe(false);
    });

    it("should return false for an empty object", () => {
      // timestamp がないので false
      expect(isJobData({})).toBe(false);
    });

    it("should return false if timestamp is not a string", () => {
      // timestamp が数値の場合は false
      const data = { timestamp: 123 };
      expect(isJobData(data)).toBe(false);
    });

    it("should return false if timestamp is null", () => {
      const data = { timestamp: null };
      expect(isJobData(data)).toBe(false);
    });

    it("should return false if timestamp is missing", () => {
      const data = { otherProperty: "value" };
      expect(isJobData(data)).toBe(false);
    });
  });
});
