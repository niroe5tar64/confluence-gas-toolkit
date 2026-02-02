import { describe, expect, it } from "bun:test";
import { isPageConfig, isPageConfigRecord, validatePageConfigs } from "./page-config-validator";

describe("isPageConfig", () => {
  it("有効な PageConfig を true と判定する", () => {
    const validConfig = {
      rootPageIds: ["123", "456"],
      spaceKey: "SPACE_A",
    };
    expect(isPageConfig(validConfig)).toBe(true);
  });

  it("rootPageIds が空配列でも true と判定する", () => {
    const config = {
      rootPageIds: [],
      spaceKey: "SPACE_A",
    };
    expect(isPageConfig(config)).toBe(true);
  });

  it("rootPageIds が配列でない場合は false と判定する", () => {
    const invalidConfig = {
      rootPageIds: "not-an-array",
      spaceKey: "SPACE_A",
    };
    expect(isPageConfig(invalidConfig)).toBe(false);
  });

  it("rootPageIds に文字列以外が含まれている場合は false と判定する", () => {
    const invalidConfig = {
      rootPageIds: ["123", 456],
      spaceKey: "SPACE_A",
    };
    expect(isPageConfig(invalidConfig)).toBe(false);
  });

  it("spaceKey がない場合は false と判定する", () => {
    const invalidConfig = {
      rootPageIds: ["123"],
    };
    expect(isPageConfig(invalidConfig)).toBe(false);
  });

  it("spaceKey が文字列でない場合は false と判定する", () => {
    const invalidConfig = {
      rootPageIds: ["123"],
      spaceKey: 123,
    };
    expect(isPageConfig(invalidConfig)).toBe(false);
  });

  it("null を false と判定する", () => {
    expect(isPageConfig(null)).toBe(false);
  });

  it("undefined を false と判定する", () => {
    expect(isPageConfig(undefined)).toBe(false);
  });

  it("プリミティブ値を false と判定する", () => {
    expect(isPageConfig("string")).toBe(false);
    expect(isPageConfig(123)).toBe(false);
    expect(isPageConfig(true)).toBe(false);
  });
});

describe("isPageConfigRecord", () => {
  it("すべてのジョブ名が含まれている場合は true と判定する", () => {
    const validRecord = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123"],
        spaceKey: "SPACE_A",
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    };
    expect(isPageConfigRecord(validRecord)).toBe(true);
  });

  it("ジョブ名が不足している場合は false と判定する", () => {
    const invalidRecord = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123"],
        spaceKey: "SPACE_A",
      },
      // confluenceUpdateSummaryJob と confluenceCreateNotifyJob がない
    };
    expect(isPageConfigRecord(invalidRecord)).toBe(false);
  });

  it("ジョブの設定が不正な形式の場合は false と判定する", () => {
    const invalidRecord = {
      confluenceUpdateNotifyJob: {
        rootPageIds: "not-an-array", // 配列でない
        spaceKey: "SPACE_A",
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    };
    expect(isPageConfigRecord(invalidRecord)).toBe(false);
  });

  it("null を false と判定する", () => {
    expect(isPageConfigRecord(null)).toBe(false);
  });

  it("配列を false と判定する", () => {
    expect(isPageConfigRecord([])).toBe(false);
  });

  it("不正なオブジェクトを false と判定する", () => {
    expect(isPageConfigRecord({ invalid: "format" })).toBe(false);
  });
});

describe("validatePageConfigs", () => {
  it("有効な設定を返す", () => {
    const validConfigs = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123"],
        spaceKey: "SPACE_A",
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    };

    expect(validatePageConfigs(validConfigs)).toBe(validConfigs);
  });

  it("null の場合はエラーをスロー", () => {
    expect(() => validatePageConfigs(null)).toThrow("CONFLUENCE_PAGE_CONFIGS が未設定です");
  });

  it("undefined の場合はエラーをスロー", () => {
    expect(() => validatePageConfigs(undefined)).toThrow("CONFLUENCE_PAGE_CONFIGS が未設定です");
  });

  it("不正な形式の場合はエラーをスロー", () => {
    const invalidConfigs = { invalid: "format" } as never;
    expect(() => validatePageConfigs(invalidConfigs)).toThrow(
      "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
    );
  });

  it("ジョブ名が不足している場合はエラーをスロー", () => {
    const incompleteConfigs = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123"],
        spaceKey: "SPACE_A",
      },
    } as never;
    expect(() => validatePageConfigs(incompleteConfigs)).toThrow(
      "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
    );
  });

  it("rootPageIds が配列でない場合はエラーをスロー", () => {
    const invalidConfigs = {
      confluenceUpdateNotifyJob: {
        rootPageIds: "not-an-array",
        spaceKey: "SPACE_A",
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    } as never;
    expect(() => validatePageConfigs(invalidConfigs)).toThrow(
      "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
    );
  });

  it("rootPageIds に文字列以外が含まれている場合はエラーをスロー", () => {
    const invalidConfigs = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123", 456],
        spaceKey: "SPACE_A",
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    } as never;
    expect(() => validatePageConfigs(invalidConfigs)).toThrow(
      "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
    );
  });

  it("spaceKey がない場合はエラーをスロー", () => {
    const invalidConfigs = {
      confluenceUpdateNotifyJob: {
        rootPageIds: ["123"],
        // spaceKey がない
      },
      confluenceUpdateSummaryJob: {
        rootPageIds: ["456"],
        spaceKey: "SPACE_B",
      },
      confluenceCreateNotifyJob: {
        rootPageIds: ["789"],
        spaceKey: "SPACE_C",
      },
    } as never;
    expect(() => validatePageConfigs(invalidConfigs)).toThrow(
      "CONFLUENCE_PAGE_CONFIGS の形式が不正です",
    );
  });
});
