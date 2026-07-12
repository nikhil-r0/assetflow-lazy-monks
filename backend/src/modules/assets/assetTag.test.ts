import { describe, expect, it } from "vitest";
import { formatAssetTag, placeholderAssetTag } from "./assetTag.js";

describe("asset tag generation", () => {
  it("test_first_asset_gets_tag_AF_0001", () => {
    expect(formatAssetTag(1)).toBe("AF-0001");
  });

  it("test_tags_are_sequential_and_unique", () => {
    expect(formatAssetTag(2)).toBe("AF-0002");
    expect(formatAssetTag(12)).toBe("AF-0012");
    expect(formatAssetTag(9999)).toBe("AF-9999");
  });

  it("test_tags_beyond_9999_allow_5_digits", () => {
    expect(formatAssetTag(10000)).toBe("AF-10000");
  });

  it("test_placeholder_tag_is_distinct_before_id_known", () => {
    expect(placeholderAssetTag()).toMatch(/^AF-TEMP-/);
  });
});
