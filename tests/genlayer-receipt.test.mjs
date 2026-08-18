import assert from "node:assert/strict";
import test from "node:test";

import { genLayerExecutionOutcome } from "../lib/genlayer-receipt.ts";

test("recognizes the camelCase SDK receipt format", () => {
  assert.equal(
    genLayerExecutionOutcome({ txExecutionResultName: "FINISHED_WITH_RETURN" }),
    "SUCCESS",
  );
  assert.equal(
    genLayerExecutionOutcome({ txExecutionResultName: "FINISHED_WITH_ERROR" }),
    "FAILED",
  );
});

test("recognizes the raw StudioNet success receipt format", () => {
  assert.equal(
    genLayerExecutionOutcome({
      status_name: "FINALIZED",
      consensus_data: {
        leader_receipt: [
          {
            mode: "leader",
            execution_result: "SUCCESS",
            genvm_result: {
              raw_error: null,
              error_code: null,
            },
            result: { status: "return", payload: { readable: "null" } },
          },
        ],
      },
    }),
    "SUCCESS",
  );
});

test("recognizes raw StudioNet execution errors", () => {
  assert.equal(
    genLayerExecutionOutcome({
      consensus_data: {
        leader_receipt: [
          {
            mode: "leader",
            execution_result: "ERROR",
            result: { status: "error" },
          },
        ],
      },
    }),
    "FAILED",
  );
});

test("does not guess when a receipt has no execution result", () => {
  assert.equal(genLayerExecutionOutcome({ status_name: "PENDING" }), "UNKNOWN");
});
