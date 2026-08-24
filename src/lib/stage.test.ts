import assert from "node:assert/strict";
import test from "node:test";
import { STAGE_COUNT, slipStatus, stageFromState } from "./d1-shared.ts";

test("ESS payroll tracker follows Lite five business stages", () => {
  assert.equal(STAGE_COUNT, 5);
  assert.equal(stageFromState("DRAFT"), 1);
  assert.equal(stageFromState("AI_VALIDATING"), 2);
  assert.equal(stageFromState("PROCESSOR_REVIEW"), 2);
  assert.equal(stageFromState("CONTROLLER_REVIEW"), 3);
  assert.equal(stageFromState("PAYMENT_APPROVAL_PENDING"), 4);
  assert.equal(stageFromState("COMPLETED"), 5);
  assert.equal(stageFromState("DRAFT", "PAID"), 5);
  assert.equal(slipStatus(4), "processing");
  assert.equal(slipStatus(5), "paid");
});
