import { describe, expect, it } from "vitest";
import { maintService } from "./maint.service.js";
import { NotImplementedError } from "../../shared/errors.js";

describe("maint service phase 0 stubs", () => {
  it("test_maint_raise_not_implemented_yet", async () => {
    await expect(
      maintService.raise(
        { asset_id: 1, issue_description: "broken" },
        1,
      ),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
