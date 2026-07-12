/**
 * Builds the 409 conflict body for double-allocation (BUILD_SPEC Track B Phase 3).
 * UI uses holder_name to show "currently held by X" + Transfer CTA.
 */
export function buildAlreadyAllocatedConflict(input: {
  holderUserId: number | null;
  holderName: string;
  assetTag: string;
}): {
  error: {
    code: "CONFLICT";
    message: string;
    details: Array<{
      field: string;
      issue: string;
      holder_user_id: number | null;
      holder_name: string;
      asset_tag: string;
    }>;
  };
} {
  return {
    error: {
      code: "CONFLICT",
      message: `Asset currently held by ${input.holderName}`,
      details: [
        {
          field: "asset_id",
          issue: "already_allocated",
          holder_user_id: input.holderUserId,
          holder_name: input.holderName,
          asset_tag: input.assetTag,
        },
      ],
    },
  };
}
